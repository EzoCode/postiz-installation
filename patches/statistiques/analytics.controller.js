"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const org_from_request_1 = require("../../../../../libraries/nestjs-libraries/src/user/org.from.request");
const user_from_request_1 = require("../../../../../libraries/nestjs-libraries/src/user/user.from.request");
const swagger_1 = require("@nestjs/swagger");
const integration_service_1 = require("../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service");
const posts_service_1 = require("../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service");
let AnalyticsController = class AnalyticsController {
    constructor(_integrationService, _postsService) {
        this._integrationService = _integrationService;
        this._postsService = _postsService;
    }
    async getIntegration(org, integration, date) {
        return this._integrationService.checkAnalytics(org, integration, date);
    }
    async getCapservInsights(org, integration, date, refresh, group) {
        try { return await require('/config/capserv-stats/capserv-insights.cjs').dashboard(this._integrationService, org, integration, date, refresh === '1', group === '1'); }
        catch (error) { if(error.status === 404) throw new common_1.NotFoundException(); throw new common_1.ServiceUnavailableException('Statistics unavailable'); }
    }
    async getCapservOperations(org, integration, group) {
        try { return await require('/config/capserv-stats/operations.cjs').getOperations(org.id, integration, group === '1'); }
        catch (error) { throw new common_1.HttpException(error.status ? error.message : 'Pilotage indisponible', error.status || 503); }
    }
    async changeCapservTag(org, integration, group, body) {
        try { return await require('/config/capserv-stats/operations.cjs').changeTag(org.id, integration, group === '1', body); }
        catch (error) { throw new common_1.HttpException(error.status ? error.message : 'Modification indisponible', error.status || 503); }
    }
    async getCapservInbox(org, integration, all, refresh) {
        try { return await require('/config/capserv-stats/social-inbox.cjs').dashboard(this._integrationService, org, integration, all === '1', refresh === '1'); }
        catch (error) { throw new common_1.HttpException(error.status ? error.message : 'Messagerie indisponible', error.status || 503); }
    }
    async changeCapservInbox(org, integration, body) {
        try { return await require('/config/capserv-stats/social-inbox.cjs').changeState(this._integrationService, org, integration, body); }
        catch (error) { throw new common_1.HttpException(error.status ? error.message : 'Messagerie indisponible', error.status || 503); }
    }
    async replyCapservInbox(org, integration, body, user) {
        try { return await require('/config/capserv-stats/social-inbox.cjs').reply(this._integrationService, org, integration, body, user); }
        catch (error) { throw new common_1.HttpException(error.status ? error.message : 'Messagerie indisponible', error.status || 503); }
    }
    async getCreation(org, integration) {
        try { return await require('/config/capserv-stats/creation.cjs').dashboard(org.id,integration); }
        catch(error) { throw new common_1.HttpException(error.status?error.message:'Création indisponible',error.status||503); }
    }
    async changeCreation(org, integration, body) {
        try { return await require('/config/capserv-stats/creation.cjs').change(org.id,integration,body); }
        catch(error) { throw new common_1.HttpException(error.status?error.message:'Modification indisponible',error.status||503); }
    }
    async getSuivi(org, integration) {
        try { return await require('/config/capserv-stats/suivi.cjs').dashboard(org.id,integration); }
        catch(error) { throw new common_1.HttpException(error.status?error.message:'Suivi indisponible',error.status||503); }
    }
    async getWatch(org, integration) {
        try { return await require('/config/capserv-stats/watch.cjs').dashboard(org.id,integration); }
        catch(error) { throw new common_1.HttpException(error.status?error.message:'Veille indisponible',error.status||503); }
    }
    async changeWatch(org,integration,body,user) {
        try { return await require('/config/capserv-stats/watch.cjs').change(org.id,integration,body,user); }
        catch(error) { throw new common_1.HttpException(error.status?error.message:'Veille indisponible',error.status||503); }
    }
    async getPostAnalytics(org, postId, date) {
        return this._postsService.checkPostAnalytics(org.id, postId, +date);
    }
};
exports.AnalyticsController = AnalyticsController;
tslib_1.__decorate([
    (0, common_1.Get)('/:integration/capserv/creation'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__metadata('design:type', Function),
    tslib_1.__metadata('design:paramtypes', [Object, String]),
    tslib_1.__metadata('design:returntype', Promise)
], AnalyticsController.prototype, 'getCreation', null);

tslib_1.__decorate([
    (0, common_1.Put)('/:integration/capserv/creation'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__param(2, (0, common_1.Body)()),
    tslib_1.__metadata('design:type', Function),
    tslib_1.__metadata('design:paramtypes', [Object, String, Object]),
    tslib_1.__metadata('design:returntype', Promise)
], AnalyticsController.prototype, 'changeCreation', null);

tslib_1.__decorate([
    (0, common_1.Get)('/:integration'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__param(2, (0, common_1.Query)('date')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getIntegration", null);
tslib_1.__decorate([
    (0, common_1.Get)('/post/:postId'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('postId')),
    tslib_1.__param(2, (0, common_1.Query)('date')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPostAnalytics", null);
tslib_1.__decorate([
    (0, common_1.Get)('/:integration/capserv'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__param(2, (0, common_1.Query)('date')),
    tslib_1.__param(3, (0, common_1.Query)('refresh')),
    tslib_1.__param(4, (0, common_1.Query)('group')),
    tslib_1.__metadata('design:type', Function),
    tslib_1.__metadata('design:paramtypes', [Object, String, String, String, String]),
    tslib_1.__metadata('design:returntype', Promise)
], AnalyticsController.prototype, 'getCapservInsights', null);
tslib_1.__decorate([
    (0, common_1.Get)('/:integration/capserv/operations'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__param(2, (0, common_1.Query)('group')),
    tslib_1.__metadata('design:type', Function),
    tslib_1.__metadata('design:paramtypes', [Object, String, String]),
    tslib_1.__metadata('design:returntype', Promise)
], AnalyticsController.prototype, 'getCapservOperations', null);
tslib_1.__decorate([
    (0, common_1.Put)('/:integration/capserv/tags'),
    tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()),
    tslib_1.__param(1, (0, common_1.Param)('integration')),
    tslib_1.__param(2, (0, common_1.Query)('group')),
    tslib_1.__param(3, (0, common_1.Body)()),
    tslib_1.__metadata('design:type', Function),
    tslib_1.__metadata('design:paramtypes', [Object, String, String, Object]),
    tslib_1.__metadata('design:returntype', Promise)
], AnalyticsController.prototype, 'changeCapservTag', null);
tslib_1.__decorate([(0, common_1.Get)('/:integration/capserv/inbox'), (0, common_1.Header)('Cache-Control', 'private, no-store'), tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()), tslib_1.__param(1, (0, common_1.Param)('integration')), tslib_1.__param(2, (0, common_1.Query)('all')), tslib_1.__param(3, (0, common_1.Query)('refresh')), tslib_1.__metadata('design:type', Function), tslib_1.__metadata('design:paramtypes', [Object, String, String, String]), tslib_1.__metadata('design:returntype', Promise)], AnalyticsController.prototype, 'getCapservInbox', null);
tslib_1.__decorate([(0, common_1.Post)('/:integration/capserv/inbox/state'), tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()), tslib_1.__param(1, (0, common_1.Param)('integration')), tslib_1.__param(2, (0, common_1.Body)()), tslib_1.__metadata('design:type', Function), tslib_1.__metadata('design:paramtypes', [Object, String, Object]), tslib_1.__metadata('design:returntype', Promise)], AnalyticsController.prototype, 'changeCapservInbox', null);
tslib_1.__decorate([(0, common_1.Post)('/:integration/capserv/inbox/reply'), tslib_1.__param(0, (0, org_from_request_1.GetOrgFromRequest)()), tslib_1.__param(1, (0, common_1.Param)('integration')), tslib_1.__param(2, (0, common_1.Body)()), tslib_1.__param(3, (0, user_from_request_1.GetUserFromRequest)()), tslib_1.__metadata('design:type', Function), tslib_1.__metadata('design:paramtypes', [Object, String, Object, Object]), tslib_1.__metadata('design:returntype', Promise)], AnalyticsController.prototype, 'replyCapservInbox', null);
tslib_1.__decorate([(0,common_1.Get)('/:integration/capserv/watch'),(0,common_1.Header)('Cache-Control','private, no-store'),tslib_1.__param(0,(0,org_from_request_1.GetOrgFromRequest)()),tslib_1.__param(1,(0,common_1.Param)('integration')),tslib_1.__metadata('design:type',Function),tslib_1.__metadata('design:paramtypes',[Object,String]),tslib_1.__metadata('design:returntype',Promise)],AnalyticsController.prototype,'getWatch',null);
tslib_1.__decorate([(0,common_1.Get)('/:integration/capserv/suivi'),(0,common_1.Header)('Cache-Control','private, no-store'),tslib_1.__param(0,(0,org_from_request_1.GetOrgFromRequest)()),tslib_1.__param(1,(0,common_1.Param)('integration')),tslib_1.__metadata('design:type',Function),tslib_1.__metadata('design:paramtypes',[Object,String]),tslib_1.__metadata('design:returntype',Promise)],AnalyticsController.prototype,'getSuivi',null);
tslib_1.__decorate([(0,common_1.Post)('/:integration/capserv/watch'),(0,common_1.Header)('Cache-Control','private, no-store'),tslib_1.__param(0,(0,org_from_request_1.GetOrgFromRequest)()),tslib_1.__param(1,(0,common_1.Param)('integration')),tslib_1.__param(2,(0,common_1.Body)()),tslib_1.__param(3,(0,user_from_request_1.GetUserFromRequest)()),tslib_1.__metadata('design:type',Function),tslib_1.__metadata('design:paramtypes',[Object,String,Object,Object]),tslib_1.__metadata('design:returntype',Promise)],AnalyticsController.prototype,'changeWatch',null);
exports.AnalyticsController = AnalyticsController = tslib_1.__decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, common_1.Controller)('/analytics'),
    tslib_1.__metadata("design:paramtypes", [integration_service_1.IntegrationService,
        posts_service_1.PostsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map