const WebSocket = require('ws');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // 存储连接的用户 {userId: ws}
    }

    init(server) {
        this.wss = new WebSocket.Server({ server });

        this.wss.on('connection', (ws, req) => {
            // 从查询参数获取userId (前端连接时需要传递)
            const userId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('userId');

            if (!userId) {
                ws.close();
                return;
            }

            console.log(`用户 ${userId} 已连接`);
            this.clients.set(userId, ws);

            ws.on('close', () => {
                console.log(`用户 ${userId} 已断开连接`);
                this.clients.delete(userId);
            });

            ws.on('error', (err) => {
                console.error(`用户 ${userId} 连接错误:`, err);
                this.clients.delete(userId);
            });
        });
    }

    // 发送消息给指定用户
    sendToUser(userId, message) {
        if (this.clients.has(userId)) {
            const client = this.clients.get(userId);
            client.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
}

module.exports = new WebSocketService();