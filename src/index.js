export default {
    async fetch(request) {
        // 这个函数不会真正被调用，因为 assets 会拦截请求，
        // 但必须有 main 字段，且文件存在。
        return new Response('Hello, World!');
    }
};