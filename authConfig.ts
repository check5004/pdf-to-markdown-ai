import type { Configuration } from '@azure/msal-browser';

/**
 * 重要: 以下の値を、あなたのAzure ADアプリケーション登録情報に置き換えてください。
 * これは、Azureポータル (portal.azure.com) の Microsoft Entra ID > アプリの登録 から取得できます。
 */

// アプリーション（クライアント）ID
// 例: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
const MSAL_CLIENT_ID = "94d2b1b3-caae-4abe-b768-076144623c86";

// ディレクトリ（テナント）ID
// マルチテナント（任意組織の職場/学校アカウント）を許可する場合は 'organizations' を使用します。
// 特定のテナントに限定する場合は、そのテナントIDを指定します。
const MSAL_TENANT_ID = "organizations";


// MSAL設定オブジェクト
export const msalConfig: Configuration = {
  auth: {
    clientId: MSAL_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MSAL_TENANT_ID}`,
    redirectUri: window.location.origin, // 現在のオリジンをリダイレクトURIとして設定
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage"
    storeAuthStateInCookie: false,
  },
};

// ログインリクエスト時に要求するスコープ（権限）
export const loginRequest = {
  scopes: ["User.Read"] // ユーザーの基本プロファイルを読み取る権限を要求
};

// アプリケーションの利用を許可するメールドメイン
export const AUTHORIZED_DOMAIN = "toukei.co.jp";