module.exports = {
    jwtSecretKey: process.env.JWT_SECRET || 'Asuna70',
    server: {
        host: process.env.HOST || 'localhost',
        port: Number(process.env.PORT) || 3007,
        get baseUrl() {
            return `http://${this.host}:${this.port}`;
        },
    },
};
