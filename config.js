module.exports = {
    jwtSecretKey: 'Asuna70',
    server: {
        host: process.env.HOST || 'localhost',
        port: process.env.PORT || 3007,
        get baseUrl() {
            return `http://${this.host}:${this.port}`;
        }
    }
}