"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookProvider = exports.META_GRAPH_API_VERSION = void 0;
const tslib_1 = require("tslib");
const make_secure_id_1 = require("../../services/make.secure.id");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const social_abstract_1 = require("../social.abstract");
const facebook_dto_1 = require("../../dtos/posts/providers-settings/facebook.dto");
const has_extension_1 = require("../../../../helpers/src/utils/has.extension");
const timer_1 = require("../../../../helpers/src/utils/timer");
const rules_description_decorator_1 = require("../../chat/rules.description.decorator");
exports.META_GRAPH_API_VERSION = 'v25.0';
let FacebookProvider = class FacebookProvider extends social_abstract_1.SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'facebook';
        this.name = 'Facebook Page';
        this.isBetweenSteps = true;
        this.scopes = [
            'pages_show_list',
            'pages_manage_posts',
            'pages_read_engagement',
            'read_insights',
        ];
        this.maxConcurrentJob = 500;
        this.editor = 'normal';
        this.dto = facebook_dto_1.FacebookDto;
    }
    maxLength() {
        return 63206;
    }
    async checkValidity([firstPost], settings) {
        if (settings?.post_type === 'story') {
            if (!firstPost?.length) {
                return 'Story should have at least one media';
            }
        }
        return true;
    }
    handleErrors(body, status) {
        if (body.indexOf('Error validating access token') > -1) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your Facebook account',
            };
        }
        if (body.indexOf('REVOKED_ACCESS_TOKEN') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token has been revoked, please re-authenticate',
            };
        }
        if (body.indexOf('Unpublished posts must be posted to a page as the page itself') > -1) {
            return {
                type: 'refresh-token',
                value: 'Postiz is not authorized to publish as this page, please reconnect the channel',
            };
        }
        if (body.indexOf('(#200)') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook rejected the post due to missing permissions. Make sure your Facebook account has full content access to the Page, then reconnect the channel.',
            };
        }
        if (body.indexOf('1366046') > -1) {
            return {
                type: 'bad-body',
                value: 'Photos should be smaller than 4 MB and saved as JPG, PNG',
            };
        }
        if (body.indexOf('1390008') > -1) {
            return {
                type: 'retry',
                value: 'You are posting too fast, please slow down',
            };
        }
        if (body.indexOf('1346003') > -1) {
            return {
                type: 'bad-body',
                value: 'Content flagged as abusive by Facebook',
            };
        }
        if (body.indexOf('1404006') > -1) {
            return {
                type: 'bad-body',
                value: "We couldn't post your comment, A security check in facebook required to proceed.",
            };
        }
        if (body.indexOf('2069019') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid file',
            };
        }
        if (body.indexOf('1404102') > -1) {
            return {
                type: 'bad-body',
                value: 'Content violates Facebook Community Standards',
            };
        }
        if (body.indexOf('1404078') > -1) {
            return {
                type: 'refresh-token',
                value: 'Page publishing authorization required, please re-authenticate',
            };
        }
        if (body.indexOf('1366051') > -1) {
            return {
                type: 'bad-body',
                value: 'These photos were already posted.',
            };
        }
        if (body.indexOf('1609008') > -1) {
            return {
                type: 'bad-body',
                value: 'Cannot post Facebook.com links',
            };
        }
        if (body.indexOf('2061006') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid URL format in post content',
            };
        }
        if (body.indexOf('1349125') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid content format',
            };
        }
        if (body.indexOf('1404112') > -1) {
            return {
                type: 'bad-body',
                value: 'For security reasons, your account has limited access to the site for a few days',
            };
        }
        if (body.indexOf('Name parameter too long') > -1) {
            return {
                type: 'bad-body',
                value: 'Post content is too long',
            };
        }
        if (body.indexOf('1363047') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        if (body.indexOf('1609010') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        if (body.indexOf('4854002') > -1) {
            return {
                type: 'bad-body',
                value: 'Confirm your identity before you can publish as this Page. Open the Facebook app on your phone and follow the instructions',
            };
        }
        if (body.indexOf('(#100) No permission to publish the video') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook return: No permission to publish the video',
            };
        }
        if (/"error_subcode":459\b/.test(body)) {
            return {
                type: 'bad-body',
                value: 'Facebook is asking you to resolve a security check. Log in at facebook.com, complete it, then try again',
            };
        }
        if (/"error_subcode":492\b/.test(body)) {
            return {
                type: 'bad-body',
                value: 'Your Facebook user no longer has a role on this Page. Ask a Page admin to grant you a role, then reconnect the channel',
            };
        }
        if (body.indexOf('must be granted before impersonating') > -1) {
            return {
                type: 'refresh-token',
                value: 'Facebook Page permissions are missing, please reconnect the channel and allow all permissions',
            };
        }
        if (/"error_subcode":33\b/.test(body) &&
            body.indexOf('does not exist') > -1) {
            return {
                type: 'bad-body',
                value: 'The Facebook Page or post this was targeting no longer exists, please reconnect the channel and schedule again',
            };
        }
        if (body.indexOf('Sorry, something went wrong') > -1) {
            return {
                type: 'retry',
                value: 'Facebook is temporarily unavailable, please try again later',
            };
        }
        if (body.indexOf('490') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token expired, please re-authenticate',
            };
        }
        if (status === 401) {
            return {
                type: 'bad-body',
                value: 'An unknown error occurred, please try again later or contact support',
            };
        }
        return undefined;
    }
    async refreshToken(refresh_token) {
        return {
            refreshToken: '',
            expiresIn: 0,
            accessToken: '',
            id: '',
            name: '',
            picture: '',
            username: '',
        };
    }
    async generateAuthUrl() {
        const state = (0, make_secure_id_1.makeSecureId)(6);
        return {
            url: `https://www.facebook.com/${exports.META_GRAPH_API_VERSION}/dialog/oauth` +
                `?client_id=${process.env.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook`)}` +
                `&state=${state}` +
                `&scope=${this.scopes.join(',')}`,
            codeVerifier: (0, make_secure_id_1.makeSecureId)(10),
            state,
        };
    }
    async reConnect(id, requiredId, accessToken) {
        const information = await this.fetchPageInformation(accessToken, {
            page: requiredId,
        });
        return {
            id: information.id,
            name: information.name,
            accessToken: information.access_token,
            picture: information.picture,
            username: information.username,
        };
    }
    async authenticate(params) {
        const getAccessToken = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/oauth/access_token` +
            `?client_id=${process.env.FACEBOOK_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
            `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
            `&code=${params.code}`)).json();
        const { access_token } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/oauth/access_token` +
            '?grant_type=fb_exchange_token' +
            `&client_id=${process.env.FACEBOOK_APP_ID}` +
            `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
            `&fb_exchange_token=${getAccessToken.access_token}&fields=access_token,expires_in`)).json();
        const { data } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me/permissions?access_token=${access_token}`)).json();
        const permissions = data
            .filter((d) => d.status === 'granted')
            .map((p) => p.permission);
        this.checkScopes(this.scopes, permissions);
        const { id, name, picture } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me?fields=id,name,picture&access_token=${access_token}`)).json();
        return {
            id,
            name,
            accessToken: access_token,
            refreshToken: access_token,
            expiresIn: (0, dayjs_1.default)().add(59, 'days').unix() - (0, dayjs_1.default)().unix(),
            picture: picture?.data?.url || '',
            username: '',
        };
    }
    async pages(accessToken) {
        const seenIds = new Set();
        const allPages = [];
        const fetchPaginated = async (startUrl) => {
            let nextUrl = startUrl;
            while (nextUrl) {
                const response = await (await fetch(nextUrl)).json();
                if (response.data) {
                    for (const page of response.data) {
                        if (!seenIds.has(page.id)) {
                            seenIds.add(page.id);
                            allPages.push(page);
                        }
                    }
                }
                nextUrl = response.paging?.next;
            }
        };
        await fetchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me/accounts?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
        try {
            let bizUrl = `https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me/businesses?access_token=${accessToken}`;
            while (bizUrl) {
                const bizResponse = await (await fetch(bizUrl)).json();
                if (bizResponse.data) {
                    for (const business of bizResponse.data) {
                        try {
                            await fetchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${business.id}/owned_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                        }
                        catch {
                        }
                        try {
                            await fetchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${business.id}/client_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                        }
                        catch {
                        }
                    }
                }
                bizUrl = bizResponse.paging?.next;
            }
        }
        catch {
        }
        for (const pageId of (process.env.POSTIZ_FACEBOOK_PAGE_IDS || '').split(',').filter(id => /^\d+$/.test(id))) {
            if (seenIds.has(pageId)) continue;
            const page = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${pageId}?fields=id,username,name,access_token,picture.type(large)`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })).json();
            if (String(page.id) === pageId && page.access_token) {
                seenIds.add(pageId); allPages.push(page);
            }
        }
        return allPages;
    }
    async fetchPageInformation(accessToken, data) {
        const pageId = data.page;
        const fields = 'id,username,name,access_token,picture.type(large)';
        // Resolve only the explicit Page using Meta's existing permission checks.
        const direct = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${encodeURIComponent(pageId)}?fields=${fields}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })).json();
        if (String(direct.id) === String(pageId) && direct.access_token) {
            return { id: direct.id, name: direct.name, access_token: direct.access_token,
                picture: direct.picture?.data?.url || '', username: direct.username };
        }
        let foundWithoutToken = false;
        const searchPaginated = async (startUrl) => {
            let url = startUrl;
            while (url) {
                const response = await (await fetch(url)).json();
                if (response.data) {
                    const page = response.data.find((p) => String(p.id) === String(pageId));
                    if (page && !page.access_token) {
                        foundWithoutToken = true;
                    }
                    else if (page) {
                        return {
                            id: page.id,
                            name: page.name,
                            access_token: page.access_token,
                            picture: page.picture?.data?.url || '',
                            username: page.username,
                        };
                    }
                }
                url = response.paging?.next;
            }
            return null;
        };
        const fromAccounts = await searchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me/accounts?fields=${fields}&limit=100&access_token=${accessToken}`);
        if (fromAccounts)
            return fromAccounts;
        try {
            let bizUrl = `https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/me/businesses?access_token=${accessToken}`;
            while (bizUrl) {
                const bizResponse = await (await fetch(bizUrl)).json();
                if (bizResponse.data) {
                    for (const business of bizResponse.data) {
                        try {
                            const fromOwned = await searchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${business.id}/owned_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                            if (fromOwned)
                                return fromOwned;
                        }
                        catch {
                        }
                        try {
                            const fromClient = await searchPaginated(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${business.id}/client_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                            if (fromClient)
                                return fromClient;
                        }
                        catch {
                        }
                    }
                }
                bizUrl = bizResponse.paging?.next;
            }
        }
        catch {
        }
        if (foundWithoutToken) {
            throw new Error('Your Facebook user has no permission to manage this page. Ask a page admin for full content access, then reconnect the channel');
        }
        throw new Error('Page not found in your accounts');
    }
    async fbVideoStatus(videoId, accessToken) {
        const { status } = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${videoId}?fields=status&access_token=${accessToken}`, undefined, '', 0, true)).json();
        const videoStatus = status?.video_status || 'in_progress';
        if (videoStatus === 'error') {
            throw new social_abstract_1.BadBody(this.identifier, JSON.stringify({ status }), '{}', 'Video processing failed');
        }
        return videoStatus === 'upload_complete' || videoStatus === 'ready';
    }
    async postPending(id, accessToken, postDetails, integration) {
        const [firstPost] = postDetails;
        const isStory = firstPost?.settings?.post_type === 'story';
        if (isStory) {
            const items = [];
            for (const media of firstPost?.media || []) {
                if ((0, has_extension_1.hasExtension)(media.path, 'mp4')) {
                    const { video_id, upload_url } = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/video_stories?upload_phase=start&access_token=${accessToken}`, {
                        method: 'POST',
                    }, 'start video story upload')).json();
                    await this.fetch(upload_url, {
                        method: 'POST',
                        headers: {
                            Authorization: `OAuth ${accessToken}`,
                            file_url: media.path,
                        },
                    }, 'upload video story');
                    items.push({ kind: 'video', mediaId: video_id });
                }
                else {
                    const { id: photoId } = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/photos?access_token=${accessToken}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: media.path,
                            published: false,
                        }),
                    }, 'upload photo story')).json();
                    items.push({ kind: 'photo', mediaId: photoId });
                }
            }
            return [
                {
                    id: firstPost.id,
                    postId: '',
                    releaseURL: '',
                    status: 'pending',
                    pendingData: {
                        postType: 'story',
                        items,
                        publishedCount: 0,
                        lastPostId: '',
                    },
                },
            ];
        }
        return this.postNonStory(id, accessToken, postDetails);
    }
    async checkPostStatus(accessToken, pendingData, integration) {
        if (pendingData.attempting != null && pendingData.confirmed) {
            throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'Facebook may have already published part of the story, please check your page before posting again to avoid duplicates');
        }
        for (const item of pendingData.items.slice(pendingData.publishedCount)) {
            if (item.kind !== 'video') {
                continue;
            }
            if (!(await this.fbVideoStatus(item.mediaId, accessToken))) {
                return { status: 'pending', pendingData };
            }
        }
        if (pendingData.attempting != null && !pendingData.confirmed) {
            return {
                status: 'ready',
                pendingData: { ...pendingData, confirmed: true },
            };
        }
        return { status: 'ready', pendingData };
    }
    async finalizePost(accessToken, pendingData, integration) {
        if (pendingData.attempting == null || !pendingData.confirmed) {
            return {
                status: 'pending',
                pendingData: {
                    ...pendingData,
                    attempting: pendingData.publishedCount,
                    confirmed: false,
                },
            };
        }
        const item = pendingData.items[pendingData.publishedCount];
        const { post_id: storyPostId } = await (await this.fetch(item.kind === 'video'
            ? `https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${integration.internalId}/video_stories?upload_phase=finish&video_id=${item.mediaId}&access_token=${accessToken}`
            : `https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${integration.internalId}/photo_stories?photo_id=${item.mediaId}&access_token=${accessToken}`, {
            method: 'POST',
        }, item.kind === 'video'
            ? 'finish video story upload'
            : 'publish photo story')).json();
        const publishedCount = pendingData.publishedCount + 1;
        if (publishedCount < pendingData.items.length) {
            return {
                status: 'pending',
                pendingData: {
                    ...pendingData,
                    publishedCount,
                    lastPostId: storyPostId,
                    attempting: null,
                    confirmed: false,
                },
            };
        }
        return {
            status: 'completed',
            postId: storyPostId,
            releaseURL: `https://www.facebook.com/stories/${storyPostId}`,
        };
    }
    async post(id, accessToken, postDetails, integration) {
        const [firstPost] = postDetails;
        const [response] = await this.postPending(id, accessToken, postDetails, integration);
        if (response.status !== 'pending') {
            return [response];
        }
        let pendingData = response.pendingData;
        const started = Date.now();
        while (true) {
            if (Date.now() - started > 8 * 60 * 1000) {
                throw new social_abstract_1.BadBody(this.identifier, '{}', '{}', 'Video processing timed out');
            }
            const check = await this.checkPostStatus(accessToken, pendingData, integration);
            if (check.status === 'pending') {
                pendingData = check.pendingData;
                await (0, timer_1.timer)(10000);
                continue;
            }
            const result = check.status === 'ready'
                ? await this.finalizePost(accessToken, check.pendingData, integration)
                : check;
            if (result.status === 'completed') {
                return [
                    {
                        id: firstPost.id,
                        postId: result.postId,
                        releaseURL: result.releaseURL,
                        status: 'success',
                    },
                ];
            }
            pendingData = result.pendingData;
        }
    }
    async postNonStory(id, accessToken, postDetails) {
        const [firstPost] = postDetails;
        let finalId = '';
        let finalUrl = '';
        if ((0, has_extension_1.hasExtension)(firstPost?.media?.[0]?.path, 'mp4')) {
            const { id: videoId, permalink_url, ...all } = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_url: firstPost?.media?.[0]?.path,
                    description: firstPost.message,
                    ...(firstPost?.settings?.title
                        ? { title: firstPost.settings.title }
                        : {}),
                    published: true,
                }),
            }, 'upload mp4')).json();
            finalUrl = 'https://www.facebook.com/reel/' + videoId;
            finalId = videoId;
        }
        else {
            const uploadPhotos = !firstPost?.media?.length
                ? []
                : await Promise.all(firstPost.media.map(async (media) => {
                    const { id: photoId } = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/photos?access_token=${accessToken}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: media.path,
                            published: false,
                        }),
                    }, 'upload images slides')).json();
                    return { media_fbid: photoId };
                }));
            const presetId = !uploadPhotos?.length &&
                firstPost?.settings?.text_format_preset_id &&
                (firstPost.message?.length || 0) <= facebook_dto_1.FACEBOOK_PRESET_MAX_CHARS
                ? firstPost.settings.text_format_preset_id
                : undefined;
            const publishFeed = async (withPreset) => (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(uploadPhotos?.length
                        ? { attached_media: uploadPhotos }
                        : {}),
                    ...(firstPost?.settings?.url
                        ? { link: firstPost.settings.url }
                        : {}),
                    ...(withPreset && presetId
                        ? { text_format_preset_id: presetId }
                        : {}),
                    message: firstPost.message,
                    published: true,
                }),
            }, 'finalize upload')).json();
            const isPresetRejection = (err) => {
                const detail = `${err?.details?.[0]?.json ?? ''} ${err?.message ?? ''}`;
                if (/access token|re-authenticate|revoked|"code":\s*190\b/i.test(detail)) {
                    return false;
                }
                return (/text_format_preset_id/i.test(detail) ||
                    /"code":\s*1\b/.test(detail) ||
                    String(err?.message) === 'Unknown Error');
            };
            let feedResult;
            try {
                feedResult = await publishFeed(!!presetId);
            }
            catch (err) {
                if (!presetId || !isPresetRejection(err)) {
                    throw err;
                }
                console.warn('Facebook rejected text_format_preset_id — dropping the background and publishing as plain text', {
                    preset: presetId,
                    facebook: err?.details?.[0]?.json,
                    message: err?.message,
                });
                feedResult = await publishFeed(false);
            }
            const { id: postId, permalink_url, ...all } = feedResult;
            finalUrl = permalink_url;
            finalId = postId;
        }
        return [
            {
                id: firstPost.id,
                postId: finalId,
                releaseURL: finalUrl,
                status: 'success',
            },
        ];
    }
    async comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        const [commentPost] = postDetails;
        const replyToId = lastCommentId || postId;
        const data = await (await this.fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${replyToId}/comments?access_token=${accessToken}&fields=id,permalink_url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...(commentPost.media?.length
                    ? { attachment_url: commentPost.media[0].path }
                    : {}),
                message: commentPost.message,
            }),
        }, 'add comment')).json();
        return [
            {
                id: commentPost.id,
                postId: data.id,
                releaseURL: data.permalink_url,
                status: 'success',
            },
        ];
    }
    async analytics(id, accessToken, date) {
        const until = (0, dayjs_1.default)().endOf('day').unix();
        const since = (0, dayjs_1.default)().subtract(date, 'day').unix();
        const { data, error } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${id}/insights?metric=page_total_media_view_unique,page_media_view,page_post_engagements,page_daily_follows&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
        if (error) {
            console.warn('Facebook page insights returned an error:', { id, error });
            throw new Error(error.message);
        }
        const sumValue = (value) => {
            if (value && typeof value === 'object') {
                return Object.values(value).reduce((sum, v) => sum + (Number(v) || 0), 0);
            }
            return Number(value) || 0;
        };
        return (data?.map((d) => ({
            label: d.name === 'page_total_media_view_unique'
                ? 'Page Impressions'
                : d.name === 'page_post_engagements'
                    ? 'Posts Engagement'
                    : d.name === 'page_daily_follows'
                        ? 'Page followers'
                        : 'Media views',
            percentageChange: 5,
            data: d?.values?.map((v) => ({
                total: sumValue(v.value),
                date: (0, dayjs_1.default)(v.end_time).format('YYYY-MM-DD'),
            })),
        })) || []);
    }
    async postAnalytics(integrationId, accessToken, postId, date) {
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        if (!postId.includes('_')) {
            return this.videoPostAnalytics(accessToken, postId, today);
        }
        try {
            const { data } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${postId}/insights?metric=post_total_media_view_unique,post_reactions_by_type_total,post_clicks,post_clicks_by_type&access_token=${accessToken}`)).json();
            if (!data || data.length === 0) {
                return [];
            }
            const result = [];
            for (const metric of data) {
                const value = metric.values?.[0]?.value;
                if (value === undefined)
                    continue;
                let label = '';
                let total = '';
                switch (metric.name) {
                    case 'post_total_media_view_unique':
                        label = 'Impressions';
                        total = String(value);
                        break;
                    case 'post_clicks':
                        label = 'Clicks';
                        total = String(value);
                        break;
                    case 'post_clicks_by_type':
                        if (typeof value === 'object') {
                            const totalClicks = Object.values(value).reduce((sum, v) => sum + v, 0);
                            label = 'Clicks by Type';
                            total = String(totalClicks);
                        }
                        break;
                    case 'post_reactions_by_type_total':
                        if (typeof value === 'object') {
                            const totalReactions = Object.values(value).reduce((sum, v) => sum + v, 0);
                            label = 'Reactions';
                            total = String(totalReactions);
                        }
                        break;
                }
                if (label) {
                    result.push({
                        label,
                        percentageChange: 0,
                        data: [{ total, date: today }],
                    });
                }
            }
            return result;
        }
        catch (err) {
            console.error('Error fetching Facebook post analytics:', err);
            return [];
        }
    }
    async videoPostAnalytics(accessToken, videoId, today) {
        try {
            const { data, error } = await (await fetch(`https://graph.facebook.com/${exports.META_GRAPH_API_VERSION}/${videoId}/video_insights?metric=total_video_impressions,total_video_views,total_video_reactions_by_type_total,fb_reels_total_plays,post_video_likes_by_reaction_type,post_video_social_actions&access_token=${accessToken}`)).json();
            if (error || !data || data.length === 0) {
                if (error && !/nonexisting field/i.test(error.message || '')) {
                    console.warn('Facebook video_insights returned an error:', {
                        videoId,
                        error,
                    });
                }
                return [];
            }
            const result = [];
            for (const metric of data) {
                const value = metric.values?.[0]?.value;
                if (value === undefined)
                    continue;
                let label = '';
                let total = '';
                switch (metric.name) {
                    case 'total_video_impressions':
                        label = 'Impressions';
                        total = String(value);
                        break;
                    case 'total_video_views':
                        label = 'Views';
                        total = String(value);
                        break;
                    case 'fb_reels_total_plays':
                        label = 'Plays';
                        total = String(value);
                        break;
                    case 'total_video_reactions_by_type_total':
                    case 'post_video_likes_by_reaction_type':
                        if (typeof value === 'object') {
                            const totalReactions = Object.values(value).reduce((sum, v) => sum + v, 0);
                            label = 'Reactions';
                            total = String(totalReactions);
                        }
                        break;
                    case 'post_video_social_actions':
                        if (typeof value === 'object') {
                            const totalActions = Object.values(value).reduce((sum, v) => sum + v, 0);
                            label = 'Engagement';
                            total = String(totalActions);
                        }
                        break;
                }
                if (label) {
                    result.push({
                        label,
                        percentageChange: 0,
                        data: [{ total, date: today }],
                    });
                }
            }
            return result;
        }
        catch (err) {
            console.error('Error fetching Facebook video post analytics:', err);
            return [];
        }
    }
};
exports.FacebookProvider = FacebookProvider;
exports.FacebookProvider = FacebookProvider = tslib_1.__decorate([
    (0, rules_description_decorator_1.Rules)("Facebook posts can be text only, or include photos or a video. If it's a story, it must have at least one attachment (photo or video), and each media is published as a separate story. Video posts (not stories) can carry an optional title.")
], FacebookProvider);
//# sourceMappingURL=facebook.provider.js.map