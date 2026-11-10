"use strict";
var YoutubeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeProvider = void 0;
const tslib_1 = require("tslib");
const make_secure_id_1 = require("../../services/make.secure.id");
const googleapis_1 = require("googleapis");
const youtube_settings_dto_1 = require("../../dtos/posts/providers-settings/youtube.settings.dto");
const social_abstract_1 = require("../social.abstract");
const process = tslib_1.__importStar(require("node:process"));
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const fs_1 = require("fs");
const ssrf_safe_dispatcher_1 = require("../../dtos/webhooks/ssrf.safe.dispatcher");
const temporal_heartbeat_1 = require("../../temporal/temporal.heartbeat");
const rules_description_decorator_1 = require("../../chat/rules.description.decorator");
const clientAndYoutube = () => {
    const client = new googleapis_1.google.auth.OAuth2({
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
    });
    const youtube = (newClient) => googleapis_1.google.youtube({
        version: 'v3',
        auth: newClient,
    });
    const youtubeAnalytics = (newClient) => googleapis_1.google.youtubeAnalytics({
        version: 'v2',
        auth: newClient,
    });
    const oauth2 = (newClient) => googleapis_1.google.oauth2({
        version: 'v2',
        auth: newClient,
    });
    return { client, youtube, oauth2, youtubeAnalytics };
};
let YoutubeProvider = YoutubeProvider_1 = class YoutubeProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 200;
        this.identifier = 'youtube';
        this.name = 'YouTube';
        this.isBetweenSteps = true;
        this.dto = youtube_settings_dto_1.YoutubeSettingsDto;
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/yt-analytics.readonly',
        ];
        this.editor = 'normal';
    }
    maxLength() {
        return 5000;
    }
    async checkValidity(items) {
        const [firstItems] = items ?? [];
        if (items?.[0]?.length !== 1) {
            return 'You need one media';
        }
        if ((firstItems?.[0]?.path?.indexOf?.('mp4') ?? -1) === -1) {
            return 'Item must be a video';
        }
        return true;
    }
    handleErrors(body) {
        if (body.includes('invalidTags')) {
            return {
                type: 'bad-body',
                value: 'The maximum allowed is 500 characters in total.',
            };
        }
        if (body.includes('invalidTitle')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but we could not set the title. Title is too long.',
            };
        }
        if (body.includes('invalidDescription')) {
            return {
                type: 'bad-body',
                value: 'Your video description is invalid, it may contain disallowed characters such as < or >.',
            };
        }
        if (body.includes('invalidCategoryId')) {
            return {
                type: 'bad-body',
                value: 'The selected video category is invalid.',
            };
        }
        if (body.includes('invalidPublishAt')) {
            return {
                type: 'bad-body',
                value: 'The scheduled publishing time is invalid.',
            };
        }
        if (body.includes('invalidRecordingDetails')) {
            return {
                type: 'bad-body',
                value: 'The recording details for the video are invalid.',
            };
        }
        if (body.includes('invalidVideoGameRating')) {
            return {
                type: 'bad-body',
                value: 'The video game rating is invalid.',
            };
        }
        if (body.includes('invalidFilename')) {
            return {
                type: 'bad-body',
                value: 'The video file name is invalid.',
            };
        }
        if (body.includes('defaultLanguageNotSet')) {
            return {
                type: 'bad-body',
                value: 'We could not set the localized video details because no default language is set.',
            };
        }
        if (body.includes('invalidVideoMetadata')) {
            return {
                type: 'bad-body',
                value: 'Some of the video details are invalid, please review the title, description and tags.',
            };
        }
        if (body.includes('mediaBodyRequired')) {
            return {
                type: 'bad-body',
                value: 'The video file is missing or could not be read, please re-upload the video.',
            };
        }
        if (body.includes('imageFormatUnsupported')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but the thumbnail format is not supported, please use JPEG or PNG.',
            };
        }
        if (body.includes('imageTooTall')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but the thumbnail image is too tall.',
            };
        }
        if (body.includes('imageTooWide')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but the thumbnail image is too wide.',
            };
        }
        if (body.includes('rateLimitExceeded')) {
            return {
                type: 'bad-body',
                value: 'You are sending requests too quickly, please wait a little while and try again.',
            };
        }
        if (body.includes('failedPrecondition')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but we could not set the thumbnail. Thumbnail size is too large.',
            };
        }
        if (body.includes('uploadLimitExceeded')) {
            return {
                type: 'bad-body',
                value: 'You have reached your daily upload limit, please try again tomorrow.',
            };
        }
        if (body.includes('youtubeSignupRequired')) {
            return {
                type: 'bad-body',
                value: 'You have to link your youtube account to your google account first.',
            };
        }
        if (body.includes('youtube.thumbnail')) {
            return {
                type: 'bad-body',
                value: 'Your account is not verified, we have uploaded your video but we could not set the thumbnail. Please verify your account and try again.',
            };
        }
        if (body.includes('Unauthorized')) {
            return {
                type: 'refresh-token',
                value: 'Token expired or invalid, please reconnect your YouTube account.',
            };
        }
        if (body.includes('UNAUTHENTICATED') || body.includes('invalid_grant')) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your YouTube account',
            };
        }
        return undefined;
    }
    async refreshToken(refresh_token) {
        const { client, oauth2 } = clientAndYoutube();
        client.setCredentials({ refresh_token });
        let credentials;
        for (let essai = 1; ; essai++) {
            try {
                ({ credentials } = await client.refreshAccessToken());
                break;
            }
            catch (e) {
                // deux essais sur incident réseau ou 5xx, jamais sur invalid_grant
                const code = e?.response?.status ?? e?.status ?? e?.code;
                const transitoire = /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|socket hang up/i.test(String(code) + ' ' + String(e?.message)) || (Number(code) >= 500 && Number(code) < 600);
                if (essai >= 2 || !transitoire || /invalid_grant/i.test(String(e?.message))) throw e;
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
        const remaining = Math.floor((credentials.expiry_date - Date.now()) / 1000);
        if (!credentials.access_token || !Number.isFinite(remaining) || remaining <= 0) {
            throw new Error('YouTube refresh returned no valid access token');
        }
        // RefreshIntegrationService preserves the selected identity, name and
        // picture, then reConnect checks that channel. Google userinfo is not
        // needed to rotate a YouTube brand-account token.
        const current = { ...credentials, refresh_token: credentials.refresh_token ?? refresh_token };
        client.setCredentials(current);
        const data = { id: '', name: '', picture: '' };
        return {
            accessToken: current.access_token,
            expiresIn: remaining,
            refreshToken: current.refresh_token ?? refresh_token,
            id: data.id,
            name: data.name,
            picture: data?.picture || '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_secure_id_1.makeSecureId)(7);
        const { client } = clientAndYoutube();
        return {
            url: client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                state,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
                scope: this.scopes.slice(0),
            }),
            codeVerifier: (0, make_secure_id_1.makeSecureId)(11),
            state,
        };
    }
    async authenticate(params) {
        const { client, oauth2 } = clientAndYoutube();
        const { tokens } = await client.getToken(params.code);
        client.setCredentials(tokens);
        const { scopes } = await client.getTokenInfo(tokens.access_token);
        this.checkScopes(this.scopes, scopes);
        const user = oauth2(client);
        const { data } = await user.userinfo.get();
        const expiryDate = new Date(tokens.expiry_date);
        const unixTimestamp = Math.floor(expiryDate.getTime() / 1000) -
            Math.floor(new Date().getTime() / 1000);
        return {
            accessToken: tokens.access_token,
            expiresIn: unixTimestamp,
            refreshToken: tokens.refresh_token,
            id: data.id,
            name: data.name,
            picture: data?.picture || '',
            username: '',
        };
    }
    async pages(accessToken) {
        const { client, youtube } = clientAndYoutube();
        client.setCredentials({ access_token: accessToken });
        const youtubeClient = youtube(client);
        try {
            const response = await youtubeClient.channels.list({
                part: ['snippet', 'contentDetails', 'statistics'],
                mine: true,
            });
            const channels = response.data.items || [];
            return channels.map((channel) => ({
                id: channel.id,
                name: channel.snippet?.title || 'Unnamed Channel',
                picture: {
                    data: {
                        url: channel.snippet?.thumbnails?.default?.url || '',
                    },
                },
                username: channel.snippet?.customUrl || '',
                subscriberCount: channel.statistics?.subscriberCount || '0',
            }));
        }
        catch (error) {
            console.error('Failed to fetch YouTube channels:', error);
            return [];
        }
    }
    async fetchPageInformation(accessToken, data) {
        const { client, youtube } = clientAndYoutube();
        client.setCredentials({ access_token: accessToken });
        const youtubeClient = youtube(client);
        try {
            const response = await youtubeClient.channels.list({
                part: ['snippet', 'contentDetails', 'statistics'],
                id: [data.id],
            });
            const channel = response.data.items?.[0];
            if (!channel) {
                throw new Error('Channel not found');
            }
            return {
                id: channel.id,
                name: channel.snippet?.title || 'Unnamed Channel',
                access_token: accessToken,
                picture: channel.snippet?.thumbnails?.default?.url || '',
                username: channel.snippet?.customUrl || '',
            };
        }
        catch (error) {
            console.error('Failed to fetch YouTube channel information:', error);
            throw error;
        }
    }
    async reConnect(id, requiredId, accessToken) {
        const pages = await this.pages(accessToken);
        const findPage = pages.find((p) => p.id === requiredId);
        if (!findPage) {
            throw new Error('Channel not found');
        }
        const information = await this.fetchPageInformation(accessToken, {
            id: requiredId,
        });
        return {
            id: information.id,
            name: information.name,
            accessToken: information.access_token,
            picture: information.picture,
            username: information.username,
        };
    }
    async youtubeMediaSize(path) {
        if (path.indexOf('http') === 0) {
            (0, temporal_heartbeat_1.setHeartbeatDetails)(`youtube: media size ${(0, social_abstract_1.stripQuery)(path)}`);
            const head = await fetch(path, {
                method: 'HEAD',
                headers: { 'accept-encoding': 'identity' },
                dispatcher: (0, ssrf_safe_dispatcher_1.getSsrfSafeDispatcher)(),
            });
            const length = head.headers.get('content-length');
            if (!length) {
                throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'Could not determine the video size for the YouTube upload');
            }
            return Number(length);
        }
        return (0, fs_1.statSync)(path).size;
    }
    async youtubeChunkStream(path, start, end) {
        if (path.indexOf('http') === 0) {
            (0, temporal_heartbeat_1.setHeartbeatDetails)(`youtube: read media ${start}-${end} ${(0, social_abstract_1.stripQuery)(path)}`);
            const response = await fetch(path, {
                headers: {
                    Range: `bytes=${start}-${end}`,
                    'accept-encoding': 'identity',
                },
                dispatcher: (0, ssrf_safe_dispatcher_1.getSsrfSafeDispatcher)(),
            });
            if (response.status !== 206) {
                throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'The media storage did not return the requested byte range, please try again');
            }
            return response.body;
        }
        return (0, fs_1.createReadStream)(path, { start, end });
    }
    async probeUploadSession(accessToken, uploadUri, videoSize) {
        (0, temporal_heartbeat_1.setHeartbeatDetails)('youtube: probe resumable session');
        const probe = await fetch(uploadUri, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Range': `bytes */${videoSize}`,
            },
        });
        if (probe.status === 200 || probe.status === 201) {
            const { id } = await probe.json();
            return { videoId: String(id) };
        }
        if (probe.status === 308) {
            const range = probe.headers.get('range');
            return {
                uploadedBytes: range ? Number(range.split('-')[1]) + 1 : 0,
            };
        }
        const text = await probe.text().catch(() => '{}');
        if (probe.status === 429 || probe.status >= 500) {
            throw new Error(`YouTube upload status check failed with ${probe.status}`);
        }
        const handleError = this.handleErrors(text);
        if (probe.status === 401 || handleError?.type === 'refresh-token') {
            throw new social_abstract_1.RefreshToken(this.identifier, text, '{}');
        }
        throw new social_abstract_1.BadBody(this.identifier, text, '{}', probe.status === 404 || probe.status === 410
            ? 'The upload session expired before the video was uploaded, please post again'
            : handleError?.value || 'Failed to check the video upload status');
    }
    async postPending(id, accessToken, postDetails, integration) {
        const [firstPost, ...comments] = postDetails;
        const { settings } = firstPost;
        const path = firstPost?.media?.[0]?.path;
        const videoSize = await this.youtubeMediaSize(path);
        const session = await this.fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=id,snippet,status&notifySubscribers=true', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': 'video/mp4',
                'X-Upload-Content-Length': String(videoSize),
            },
            body: JSON.stringify({
                snippet: {
                    title: settings.title,
                    description: firstPost?.message,
                    ...(settings?.tags?.length
                        ? { tags: settings.tags.map((p) => p.label) }
                        : {}),
                },
                status: {
                    privacyStatus: settings.type,
                    selfDeclaredMadeForKids: settings.selfDeclaredMadeForKids === 'yes',
                },
            }),
        });
        const uploadUri = session.headers.get('location');
        if (!uploadUri) {
            throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'Could not start the video upload, please try again');
        }
        return [
            {
                id: firstPost.id,
                releaseURL: '',
                postId: '',
                status: 'pending',
                pendingData: {
                    uploadUri,
                    videoSize,
                    path,
                    uploadedBytes: 0,
                    thumbnail: settings?.thumbnail?.path || '',
                },
            },
        ];
    }
    async checkPostStatus(accessToken, pendingData, integration) {
        let probe;
        try {
            probe = await this.probeUploadSession(accessToken, pendingData.uploadUri, pendingData.videoSize);
        }
        catch (err) {
            if (err instanceof social_abstract_1.RefreshToken || err instanceof social_abstract_1.BadBody) {
                throw err;
            }
            return { status: 'pending', pendingData };
        }
        if ('videoId' in probe) {
            if (pendingData.thumbnail) {
                return {
                    status: 'ready',
                    pendingData: { ...pendingData, videoId: probe.videoId },
                };
            }
            return {
                status: 'completed',
                postId: probe.videoId,
                releaseURL: `https://www.youtube.com/watch?v=${probe.videoId}`,
            };
        }
        return {
            status: 'ready',
            pendingData: { ...pendingData, uploadedBytes: probe.uploadedBytes },
        };
    }
    async finalizePost(accessToken, pendingData, integration) {
        let videoId = pendingData.videoId;
        if (!videoId) {
            const probe = await this.probeUploadSession(accessToken, pendingData.uploadUri, pendingData.videoSize);
            if ('uploadedBytes' in probe) {
                const started = Date.now();
                let uploaded = probe.uploadedBytes;
                while (uploaded < pendingData.videoSize) {
                    if (Date.now() - started > YoutubeProvider_1.YOUTUBE_UPLOAD_BATCH_MS) {
                        return {
                            status: 'pending',
                            pendingData: { ...pendingData, uploadedBytes: uploaded },
                        };
                    }
                    const end = Math.min(uploaded + YoutubeProvider_1.YOUTUBE_CHUNK_SIZE, pendingData.videoSize) - 1;
                    const body = await this.youtubeChunkStream(pendingData.path, uploaded, end);
                    (0, temporal_heartbeat_1.setHeartbeatDetails)('youtube: upload chunk to google');
                    const upload = await fetch(pendingData.uploadUri, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'video/mp4',
                            'Content-Length': String(end - uploaded + 1),
                            'Content-Range': `bytes ${uploaded}-${end}/${pendingData.videoSize}`,
                        },
                        body,
                        duplex: 'half',
                    });
                    if (upload.status === 308) {
                        const range = upload.headers.get('range');
                        if (!range) {
                            return {
                                status: 'pending',
                                pendingData: { ...pendingData, uploadedBytes: uploaded },
                            };
                        }
                        uploaded = Number(range.split('-')[1]) + 1;
                        continue;
                    }
                    if (upload.status === 200 || upload.status === 201) {
                        const { id } = await upload.json();
                        videoId = String(id);
                        break;
                    }
                    const text = await upload.text().catch(() => '{}');
                    if (upload.status === 429 || upload.status >= 500) {
                        throw new Error(`YouTube chunk upload failed with ${upload.status}`);
                    }
                    const handleError = this.handleErrors(text);
                    if (upload.status === 401 || handleError?.type === 'refresh-token') {
                        throw new social_abstract_1.RefreshToken(this.identifier, text, '{}');
                    }
                    throw new social_abstract_1.BadBody(this.identifier, text, '{}', handleError?.value || 'Failed to upload the video to YouTube');
                }
                if (!videoId) {
                    return {
                        status: 'pending',
                        pendingData: { ...pendingData, uploadedBytes: uploaded },
                    };
                }
            }
            else {
                videoId = probe.videoId;
            }
        }
        if (pendingData.thumbnail) {
            const { client, youtube } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtube(client);
            await this.runInConcurrent(async () => youtubeClient.thumbnails.set({
                videoId,
                media: {
                    body: (await this.getSsrfSafeAxios()({
                        url: pendingData.thumbnail,
                        method: 'GET',
                        responseType: 'stream',
                    })).data,
                },
            }));
        }
        return {
            status: 'completed',
            postId: videoId,
            releaseURL: `https://www.youtube.com/watch?v=${videoId}`,
        };
    }
    async post(id, accessToken, postDetails, integration) {
        const [response] = await this.postPending(id, accessToken, postDetails, integration);
        if (response.status !== 'pending') {
            return [response];
        }
        let pendingData = response.pendingData;
        const started = Date.now();
        while (true) {
            if (Date.now() - started >
                8 * 60 * 1000 - YoutubeProvider_1.YOUTUBE_UPLOAD_BATCH_MS) {
                throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'The video upload took too long, please try a smaller video');
            }
            const finalize = await this.finalizePost(accessToken, pendingData, integration);
            if (finalize.status === 'completed') {
                return [
                    {
                        id: response.id,
                        releaseURL: finalize.releaseURL,
                        postId: finalize.postId,
                        status: 'success',
                    },
                ];
            }
            pendingData = finalize.pendingData;
        }
    }
    async analytics(id, accessToken, date) {
        try {
            const endDate = (0, dayjs_1.default)().format('YYYY-MM-DD');
            const startDate = (0, dayjs_1.default)().subtract(date, 'day').format('YYYY-MM-DD');
            const { client, youtubeAnalytics } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtubeAnalytics(client);
            const { data } = await youtubeClient.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,subscribersLost',
                dimensions: 'day',
                sort: 'day',
            });
            const columns = data?.columnHeaders?.map((p) => p.name);
            const mappedData = data?.rows?.map((p) => {
                return columns.reduce((acc, curr, index) => {
                    acc[curr] = p[index];
                    return acc;
                }, {});
            });
            const acc = [];
            acc.push({
                label: 'Estimated Minutes Watched',
                data: mappedData?.map((p) => ({
                    total: p.estimatedMinutesWatched,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Average View Duration',
                average: true,
                data: mappedData?.map((p) => ({
                    total: p.averageViewDuration,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Average View Percentage',
                average: true,
                data: mappedData?.map((p) => ({
                    total: p.averageViewPercentage,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Subscribers Gained',
                data: mappedData?.map((p) => ({
                    total: p.subscribersGained,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Subscribers Lost',
                data: mappedData?.map((p) => ({
                    total: p.subscribersLost,
                    date: p.day,
                })),
            });
            acc.push({
                label: 'Likes',
                data: mappedData?.map((p) => ({
                    total: p.likes,
                    date: p.day,
                })),
            });
            return acc;
        }
        catch (err) {
            return [];
        }
    }
    async postAnalytics(integrationId, accessToken, postId, date) {
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        try {
            const { client, youtube } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtube(client);
            const response = await youtubeClient.videos.list({
                part: ['statistics', 'snippet'],
                id: [postId],
            });
            const video = response.data.items?.[0];
            if (!video || !video.statistics) {
                return [];
            }
            const stats = video.statistics;
            const result = [];
            if (stats.viewCount !== undefined) {
                result.push({
                    label: 'Views',
                    percentageChange: 0,
                    data: [{ total: String(stats.viewCount), date: today }],
                });
            }
            if (stats.likeCount !== undefined) {
                result.push({
                    label: 'Likes',
                    percentageChange: 0,
                    data: [{ total: String(stats.likeCount), date: today }],
                });
            }
            if (stats.commentCount !== undefined) {
                result.push({
                    label: 'Comments',
                    percentageChange: 0,
                    data: [{ total: String(stats.commentCount), date: today }],
                });
            }
            if (stats.favoriteCount !== undefined) {
                result.push({
                    label: 'Favorites',
                    percentageChange: 0,
                    data: [{ total: String(stats.favoriteCount), date: today }],
                });
            }
            return result;
        }
        catch (err) {
            console.error('Error fetching YouTube post analytics:', err);
            return [];
        }
    }
};
exports.YoutubeProvider = YoutubeProvider;
YoutubeProvider.YOUTUBE_CHUNK_SIZE = 8 * 1024 * 1024;
YoutubeProvider.YOUTUBE_UPLOAD_BATCH_MS = 4 * 60 * 1000;
exports.YoutubeProvider = YoutubeProvider = YoutubeProvider_1 = tslib_1.__decorate([
    (0, rules_description_decorator_1.Rules)('YouTube must have on video attachment, it cannot be empty')
], YoutubeProvider);
//# sourceMappingURL=youtube.provider.js.map