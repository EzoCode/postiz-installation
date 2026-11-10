"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const integration_repository_1 = require("./integration.repository");
const integration_manager_1 = require("../../../integrations/integration.manager");
const notification_service_1 = require("../notifications/notification.service");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const timer_1 = require("../../../../../helpers/src/utils/timer");
const redis_service_1 = require("../../../redis/redis.service");
const social_abstract_1 = require("../../../integrations/social.abstract");
const upload_factory_1 = require("../../../upload/upload.factory");
const lodash_1 = require("lodash");
const utc_1 = tslib_1.__importDefault(require("dayjs/plugin/utc"));
const autopost_repository_1 = require("../autopost/autopost.repository");
const refresh_integration_service_1 = require("../../../integrations/refresh.integration.service");
const nestjs_temporal_core_1 = require("nestjs-temporal-core");
dayjs_1.default.extend(utc_1.default);
let IntegrationService = class IntegrationService {
    constructor(_integrationRepository, _autopostsRepository, _integrationManager, _notificationService, _refreshIntegrationService, _temporalService) {
        this._integrationRepository = _integrationRepository;
        this._autopostsRepository = _autopostsRepository;
        this._integrationManager = _integrationManager;
        this._notificationService = _notificationService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this._temporalService = _temporalService;
        this.storage = upload_factory_1.UploadFactory.createStorage();
    }
    async changeActiveCron(orgId) {
        const data = await this._autopostsRepository.getAutoposts(orgId);
        for (const item of data.filter((f) => f.active)) {
            try {
                await this._temporalService.terminateWorkflow(`autopost-${item.id}`);
            }
            catch (err) { }
        }
        return true;
    }
    getMentions(platform, q) {
        return this._integrationRepository.getMentions(platform, q);
    }
    insertMentions(platform, mentions) {
        return this._integrationRepository.insertMentions(platform, mentions);
    }
    async setTimes(orgId, integrationId, times) {
        return this._integrationRepository.setTimes(orgId, integrationId, times);
    }
    updateProviderSettings(org, id, additionalSettings) {
        return this._integrationRepository.updateProviderSettings(org, id, additionalSettings);
    }
    checkPreviousConnections(org, id) {
        return this._integrationRepository.checkPreviousConnections(org, id);
    }
    async createOrUpdateIntegration(additionalSettings, oneTimeToken, org, name, picture, type, internalId, provider, token, refreshToken = '', expiresIn, username, isBetweenSteps = false, refresh, timezone, customInstanceDetails) {
        const uploadedPicture = picture
            ? picture?.indexOf('imagedelivery.net') > -1
                ? picture
                : await this.storage.uploadSimple(picture).catch((err) => {
                    console.log('Failed to upload profile picture:', picture, err);
                    return undefined;
                })
            : undefined;
        return this._integrationRepository.createOrUpdateIntegration(additionalSettings, oneTimeToken, org, name, uploadedPicture, type, internalId, provider, token, refreshToken, expiresIn, username, isBetweenSteps, refresh, timezone, customInstanceDetails);
    }
    updateIntegrationGroup(org, id, group) {
        return this._integrationRepository.updateIntegrationGroup(org, id, group);
    }
    updateOnCustomerName(org, id, name) {
        return this._integrationRepository.updateOnCustomerName(org, id, name);
    }
    getIntegrationsList(org) {
        return this._integrationRepository.getIntegrationsList(org);
    }
    getChannelHealth(org, includeDeleted = false) {
        return this._integrationRepository.getChannelHealth(org, includeDeleted);
    }
    getIntegrationForOrder(id, order, user, org) {
        return this._integrationRepository.getIntegrationForOrder(id, order, user, org);
    }
    updateNameAndUrl(id, name, url) {
        return this._integrationRepository.updateNameAndUrl(id, name, url);
    }
    getIntegrationById(org, id) {
        return this._integrationRepository.getIntegrationById(org, id);
    }
    async refreshToken(provider, refresh) {
        try {
            const { refreshToken, accessToken, expiresIn } = await provider.refreshToken(refresh);
            if (!refreshToken || !accessToken || !expiresIn) {
                return false;
            }
            return { refreshToken, accessToken, expiresIn };
        }
        catch (e) {
            return false;
        }
    }
    async disconnectChannel(orgId, integration, err = '') {
        await this._integrationRepository.disconnectChannel(orgId, integration.id);
        await this.informAboutRefreshError(orgId, integration, err);
    }
    async migrateIntegration(org, oldInternalId, newProvider, auth) {
        const existing = await this._integrationRepository.getIntegrationByInternalId(org, oldInternalId);
        if (!existing ||
            this._integrationManager.getMigrationTarget(existing.providerIdentifier) !== newProvider) {
            throw new social_abstract_1.NotEnoughScopes('Please refresh the channel that needs to be refreshed');
        }
        const oldProvider = this._integrationManager.getSocialIntegration(existing.providerIdentifier);
        if (!oldProvider.migrationMatch(auth, existing)) {
            throw new social_abstract_1.NotEnoughScopes(`Please connect the same account (@${existing.profile}) that needs to be refreshed`);
        }
        if (await this._integrationRepository.getIntegrationByInternalId(org, auth.id)) {
            throw new social_abstract_1.NotEnoughScopes('This account is already connected as another channel, please delete one of them first');
        }
        return this._integrationRepository.migrateIntegration(org, existing.id, auth.id, newProvider, existing.rootInternalId === existing.internalId
            ? auth.id
            : existing.rootInternalId);
    }
    async migrateIntegrationOnConnect(org, newProvider, auth) {
        const sources = this._integrationManager.getMigrationSources(newProvider);
        if (!sources.length ||
            this._integrationManager.getSocialIntegration(newProvider).isBetweenSteps) {
            return;
        }
        if (await this._integrationRepository.getIntegrationByInternalId(org, auth.id)) {
            return;
        }
        const existing = (await this._integrationRepository.getIntegrationsList(org)).find((p) => sources.includes(p.providerIdentifier) &&
            this._integrationManager
                .getSocialIntegration(p.providerIdentifier)
                .migrationMatch(auth, p));
        if (!existing) {
            return;
        }
        return this._integrationRepository.migrateIntegration(org, existing.id, auth.id, newProvider, existing.rootInternalId === existing.internalId
            ? auth.id
            : existing.rootInternalId);
    }
    async informAboutRefreshError(orgId, integration, err = '') {
        await this._notificationService.inAppNotification(orgId, `Could not refresh your ${integration.providerIdentifier} channel ${err}`, `Could not refresh your ${integration.providerIdentifier} channel ${err}. Please go back to the system and connect it again ${process.env.FRONTEND_URL}/launches`, true, false, 'info');
    }
    async refreshNeeded(org, id) {
        return this._integrationRepository.refreshNeeded(org, id);
    }
    async setBetweenRefreshSteps(id) {
        return this._integrationRepository.setBetweenRefreshSteps(id);
    }
    async refreshTokens() {
        const integrations = await this._integrationRepository.needsToBeRefreshed();
        for (const integration of integrations) {
            const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            const data = await this.refreshToken(provider, integration.refreshToken);
            if (!data) {
                await this.informAboutRefreshError(integration.organizationId, integration);
                await this._integrationRepository.refreshNeeded(integration.organizationId, integration.id);
                return;
            }
            const { refreshToken, accessToken, expiresIn } = data;
            await this.createOrUpdateIntegration(undefined, !!provider.oneTimeToken, integration.organizationId, integration.name, undefined, 'social', integration.internalId, integration.providerIdentifier, accessToken, refreshToken, expiresIn);
        }
    }
    async disableChannel(org, id) {
        return this._integrationRepository.disableChannel(org, id);
    }
    async enableChannel(org, totalChannels, id) {
        const integrations = (await this._integrationRepository.getIntegrationsList(org)).filter((f) => !f.disabled);
        if (!!process.env.STRIPE_PUBLISHABLE_KEY &&
            integrations.length >= totalChannels) {
            throw new Error('You have reached the maximum number of channels');
        }
        return this._integrationRepository.enableChannel(org, id);
    }
    async getPostsForChannel(org, id) {
        return this._integrationRepository.getPostsForChannel(org, id);
    }
    async deleteChannel(org, id) {
        return this._integrationRepository.deleteChannel(org, id);
    }
    async disableIntegrations(org, totalChannels) {
        return this._integrationRepository.disableIntegrations(org, totalChannels);
    }
    async checkForDeletedOnceAndUpdate(org, page) {
        return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
    }
    async saveProviderPage(org, id, data) {
        const getIntegration = await this._integrationRepository.getIntegrationById(org, id);
        if (!getIntegration) {
            throw new common_1.HttpException('Integration not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (!getIntegration.inBetweenSteps) {
            throw new common_1.HttpException('Invalid request', common_1.HttpStatus.BAD_REQUEST);
        }
        const provider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
        if (!provider.fetchPageInformation) {
            throw new common_1.HttpException('Provider does not support page selection', common_1.HttpStatus.BAD_REQUEST);
        }
        const getIntegrationInformation = await provider.fetchPageInformation(getIntegration.token, data);
        await this.checkForDeletedOnceAndUpdate(org, String(getIntegrationInformation.id));
        await this._integrationRepository.updateIntegration(id, {
            picture: getIntegrationInformation.picture,
            internalId: String(getIntegrationInformation.id),
            organizationId: org,
            name: getIntegrationInformation.name,
            inBetweenSteps: false,
            token: getIntegrationInformation.access_token,
            // Preserve newly granted YouTube permissions when merging into an existing channel.
            ...(getIntegration.providerIdentifier === 'youtube' ? {
                refreshToken: getIntegration.refreshToken,
                tokenExpiration: getIntegration.tokenExpiration,
            } : {}),
            profile: getIntegrationInformation.username,
        });
        return { success: true };
    }
    async checkAnalytics(org, integration, date, forceRefresh = false) {
        const getIntegration = await this.getIntegrationById(org.id, integration);
        if (!getIntegration) {
            throw new Error('Invalid integration');
        }
        if (getIntegration.type !== 'social') {
            return [];
        }
        const integrationProvider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
        if ((0, dayjs_1.default)(getIntegration?.tokenExpiration).isBefore((0, dayjs_1.default)()) ||
            forceRefresh) {
            const data = await this._refreshIntegrationService.refresh(getIntegration);
            if (!data) {
                return [];
            }
            const { accessToken } = data;
            if (accessToken) {
                getIntegration.token = accessToken;
                if (integrationProvider.refreshWait) {
                    await (0, timer_1.timer)(10000);
                }
            }
            else {
                await this.disconnectChannel(org.id, getIntegration);
                return [];
            }
        }
        const getIntegrationData = await redis_service_1.ioRedis.get(`integration:${org.id}:${integration}:${date}`);
        if (getIntegrationData) {
            return JSON.parse(getIntegrationData);
        }
        if (integrationProvider.analytics) {
            try {
                const loadAnalytics = await integrationProvider.analytics(getIntegration.internalId, getIntegration.token, +date);
                await redis_service_1.ioRedis.set(`integration:${org.id}:${integration}:${date}`, JSON.stringify(loadAnalytics), 'EX', !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                    ? 1
                    : 3600);
                return loadAnalytics;
            }
            catch (e) {
                if (e instanceof social_abstract_1.RefreshToken) {
                    return this.checkAnalytics(org, integration, date, true);
                }
            }
        }
        return [];
    }
    customers(orgId) {
        return this._integrationRepository.customers(orgId);
    }
    async updateCustomerName(orgId, id, name) {
        const exists = await this._integrationRepository.getCustomerByName(orgId, name);
        if (exists && exists.id !== id) {
            throw new common_1.HttpException('A group with this name already exists', common_1.HttpStatus.BAD_REQUEST);
        }
        return this._integrationRepository.updateCustomerName(orgId, id, name);
    }
    getPlugsByIntegrationId(org, integrationId) {
        return this._integrationRepository.getPlugsByIntegrationId(org, integrationId);
    }
    async processInternalPlug(data, forceRefresh = false) {
        const originalIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.originalIntegration);
        const getIntegration = await this._integrationRepository.getIntegrationById(data.orgId, data.integration);
        if (!getIntegration || !originalIntegration) {
            return;
        }
        const getAllInternalPlugs = this._integrationManager
            .getInternalPlugs(getIntegration.providerIdentifier)
            .internalPlugs.find((p) => p.identifier === data.plugName);
        if (!getAllInternalPlugs) {
            return;
        }
        const getSocialIntegration = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
        await getSocialIntegration?.[getAllInternalPlugs.methodName]?.(getIntegration, originalIntegration, data.post, data.information);
        return;
    }
    async processPlugs(data) {
        const getPlugById = await this._integrationRepository.getPlug(data.plugId);
        if (!getPlugById) {
            return true;
        }
        const integration = this._integrationManager.getSocialIntegration(getPlugById.integration.providerIdentifier);
        const process = await integration[getPlugById.plugFunction](getPlugById.integration, data.postId, JSON.parse(getPlugById.data).reduce((all, current) => {
            all[current.name] = current.value;
            return all;
        }, {}));
        if (process) {
            return true;
        }
        if (data.totalRuns === data.currentRun) {
            return true;
        }
        return false;
    }
    async createOrUpdatePlug(orgId, integrationId, body) {
        const { activated } = await this._integrationRepository.createOrUpdatePlug(orgId, integrationId, body);
        return {
            activated,
        };
    }
    async changePlugActivation(orgId, plugId, status) {
        const { id, integrationId, plugFunction } = await this._integrationRepository.changePlugActivation(orgId, plugId, status);
        return { id };
    }
    async getPlugs(orgId, integrationId) {
        return this._integrationRepository.getPlugs(orgId, integrationId);
    }
    async loadExisingData(methodName, integrationId, id) {
        const exisingData = await this._integrationRepository.loadExisingData(methodName, integrationId, id);
        const loadOnlyIds = exisingData.map((p) => p.value);
        return (0, lodash_1.difference)(id, loadOnlyIds);
    }
    async findFreeDateTime(orgId, integrationsId) {
        const findTimes = await this._integrationRepository.getPostingTimes(orgId, integrationsId);
        return (0, lodash_1.uniq)(findTimes.reduce((all, current) => {
            return [
                ...all,
                ...JSON.parse(current.postingTimes).map((p) => p.time),
            ];
        }, []));
    }
};
exports.IntegrationService = IntegrationService;
exports.IntegrationService = IntegrationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => refresh_integration_service_1.RefreshIntegrationService))),
    tslib_1.__metadata("design:paramtypes", [integration_repository_1.IntegrationRepository,
        autopost_repository_1.AutopostRepository,
        integration_manager_1.IntegrationManager,
        notification_service_1.NotificationService,
        refresh_integration_service_1.RefreshIntegrationService,
        nestjs_temporal_core_1.TemporalService])
], IntegrationService);
//# sourceMappingURL=integration.service.js.map