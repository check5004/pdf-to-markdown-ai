import React from 'react';
import CollapsibleSection from './CollapsibleSection';

interface DebugInfoProps {
  debugInfo: {
    request: any;
    response: any;
    generationResponse?: any;
  };
}

const DebugInfo: React.FC<DebugInfoProps> = ({ debugInfo }) => {
  if (!debugInfo) {
    return null;
  }

  // A replacer function for JSON.stringify to truncate long strings
  const replacer = (key: string, value: any) => {
    if (typeof value === 'string' && value.length > 200) {
        if (value.startsWith('data:image') || value.length > 1000) {
            return value.substring(0, 100) + '... [TRUNCATED]';
        }
    }
    if (key === 'data' && typeof value === 'string' && value.length > 200) {
        return value.substring(0, 100) + '... [TRUNCATED]';
    }
    return value;
  };

  const formattedRequest = JSON.stringify(debugInfo.request, replacer, 2);
  const formattedResponse = JSON.stringify(debugInfo.response, replacer, 2);
  const formattedGenerationResponse = debugInfo.generationResponse
    ? JSON.stringify(debugInfo.generationResponse, null, 2)
    : null;


  return (
    <CollapsibleSection title="デバッグ情報">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">AIへのリクエストペイロード</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">これはデバッグ目的で、AIに送信された実際のリクエストボディです。画像データは短縮されています。</p>
          <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 overflow-x-auto text-sm mt-2">
            <code>
              {formattedRequest}
            </code>
          </pre>
        </div>
        <div>
          <h3 className="text-lg font-semibold">AIからのレスポンス (Chat Completions API)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">これはAIから返された完全なレスポンスボディです。</p>
          <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 overflow-x-auto text-sm mt-2">
            <code>
              {formattedResponse}
            </code>
          </pre>
        </div>
        {formattedGenerationResponse && (
          <div>
            <h3 className="text-lg font-semibold">コスト情報取得レスポンス (Generation API)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">これはコスト情報を取得するために OpenRouter の /generation エンドポイントから返されたレスポンスです。</p>
            <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 overflow-x-auto text-sm mt-2">
              <code>
                {formattedGenerationResponse}
              </code>
            </pre>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default DebugInfo;
