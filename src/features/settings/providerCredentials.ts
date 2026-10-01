export interface BrowserProviderCredentials {
  dashscopeApiKey: string;
  qwenModel: string;
  textinAppId: string;
  textinSecretCode: string;
}

export const emptyBrowserProviderCredentials: BrowserProviderCredentials = {
  dashscopeApiKey: '', qwenModel: 'qwen-plus', textinAppId: '', textinSecretCode: '',
};
