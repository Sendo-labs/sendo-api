### 🚀 SENDO-API

API REST for analyzing Solana transactions with historical price data

A TypeScript/Express API that decodes and analyzes Solana transactions in real time, with BirdEye integration for price data.

## ⚠️ Project Status

🔄 ACTIVE DEVELOPMENT

This project is currently under active development. All features are a work in progress and subject to change.

### 🚧 Features In Progress
- 🔄 Solana transaction decoding
- 🔄 BirdEye API integration
- 🔄 Advanced performance analytics
- 🔄 Rate-limit optimization
- 🔄 Automated tests
- 🔄 Full documentation
- 🔄 Additional endpoints

### 📝 Development Notes
- The project is in its alpha/beta phase
- APIs may change without notice
- Some features may be unstable
- Tests are being implemented

## ✨ Features

- 🔍 Automatic decoding of Solana transactions
- 💰 Price analysis with the BirdEye API
- 📊 Multi-protocol support: Pump.fun, Jupiter, Raydium, Orca, Meteora, Whirlpool
- 🎯 Performance computation: gains/losses, ATH, buy price vs current
- 🛡️ Security: Helmet, CORS, input validation

## 🚀 Installation

```bash
# Clone the project
git clone <your-repo>
cd sendo-api

# Install dependencies
npm install

# Configure environment variables
cp env-sample .env
# Edit .env with your API keys
```

## ⚙️ Configuration

Create a `.env` file with:

```env
PORT=4000
HELIUS_API_KEY=<your_helius_key>
BIRDEYE_API_KEY=<your_birdeye_key>
```

## 🎯 Usage

### Start the API

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build
npm start
```

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/signatures/:address` | Address signatures |
| `GET /api/v1/tokens/:address` | Held tokens |
| `GET /api/v1/transactions/:address` | Decoded transactions |
| `GET /api/v1/trades/:address` | Trades with price analysis |
| `GET /api/v1/nfts/:address` | Held NFTs |
| `GET /api/v1/global/:address` | Overview |
| `GET /health` | API status |

## 🤝 Join Us!

Hey! 👋 This project is under development and we need you!

### 🚀 Want to contribute?
Awesome! It’s simple:
1. Fork the project on GitHub
2. Clone your fork locally
3. Create a branch for your idea
4. Code your feature
5. Open a Pull Request

### 🐛 Found a bug?
No worries! 😅
- Open an Issue on GitHub
- Tell us what’s wrong
- We’ll look into it together!

### 💡 Have an idea?
Great! 🎉
- Share your ideas in Issues
- Tell us how you use the API
- Help us improve the docs

No need to be a Solana expert to contribute! 😊

---

🔄 ACTIVE DEVELOPMENT — Built with ❤️ for the Solana ecosystem