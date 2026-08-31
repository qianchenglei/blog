export default {
    async fetch(request, env) {
        // 静态资源由 assets 托管，这里通过 ASSETS 绑定把请求转交给静态文件。
        // 命中 assets 里的文件（如 index.html、posts.json、文章 md）就返回文件内容，
        // 没命中的交给 Cloudflare 返回 404。
        return env.ASSETS.fetch(request);
    }
};
