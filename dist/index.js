"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicConnect = void 0;
const types_1 = require("@web3-react/types");
const experimental_1 = require("@ethersproject/experimental");
const providers_1 = require("@ethersproject/providers");
function parseChainId(chainId) {
    return typeof chainId === "number"
        ? chainId
        : Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10);
}
class MagicConnect extends types_1.Connector {
    constructor({ actions, options, onError }) {
        super(actions, onError);
        this.connectListener = ({ chainId }) => {
            this.actions.update({ chainId: parseChainId(chainId) });
        };
        this.disconnectListener = (error) => {
            var _a;
            this.actions.resetState();
            if (error)
                (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, error);
        };
        this.chainChangedListener = (chainId) => {
            this.actions.update({ chainId: parseChainId(chainId) });
        };
        this.accountsChangedListener = (accounts) => {
            if (accounts.length === 0) {
                // handle this edge case by disconnecting
                this.actions.resetState();
            }
            else {
                this.actions.update({ accounts });
            }
        };
        this.options = options;
    }
    isomorphicInitialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.eagerConnection)
                return;
            const [{ ConnectExtension }, { Magic }] = yield Promise.all([
                Promise.resolve().then(() => __importStar(require("@magic-ext/connect"))),
                Promise.resolve().then(() => __importStar(require("magic-sdk"))),
            ]);
            const { apiKey, networkOptions } = this.options;
            this.magic = new Magic(apiKey, {
                extensions: [new ConnectExtension()],
                network: networkOptions,
            });
            const provider = new providers_1.Web3Provider(this.magic.rpcProvider);
            this.provider = new experimental_1.Eip1193Bridge(provider.getSigner(), provider);
            this.provider.on("connect", this.connectListener);
            this.provider.on("disconnect", this.disconnectListener);
            this.provider.on("chainChanged", this.chainChangedListener);
            this.provider.on("accountsChanged", this.accountsChangedListener);
            this.eagerConnection = Promise.resolve();
        });
    }
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                const walletInfo = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.connect.getWalletInfo());
                if (!this.provider || !walletInfo) {
                    throw new Error("No existing connection");
                }
                const [chainId, accounts] = yield Promise.all([
                    this.provider.request({ method: "eth_chainId" }),
                    this.provider.request({ method: "eth_accounts" }),
                ]);
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                this.eagerConnection = undefined;
                throw error;
            }
        });
    }
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                if (!this.provider) {
                    throw new Error("No existing connection");
                }
                const [chainId, accounts] = yield Promise.all([
                    this.provider.request({ method: "eth_chainId" }),
                    this.provider.request({ method: "eth_accounts" }),
                ]);
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                this.eagerConnection = undefined;
                throw error;
            }
        });
    }
    /** {@inheritdoc Connector.deactivate} */
    deactivate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.provider) {
                this.provider.off("connect", this.connectListener);
                this.provider.off("disconnect", this.disconnectListener);
                this.provider.off("chainChanged", this.chainChangedListener);
                this.provider.off("accountsChanged", this.accountsChangedListener);
                yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.connect.disconnect());
                this.provider = undefined;
            }
            this.eagerConnection = undefined;
            this.actions.resetState();
        });
    }
}
exports.MagicConnect = MagicConnect;