import React from 'react';
import { WandSparklesIcon, UploadIcon, SparklesIcon, AdjustmentsHorizontalIcon, DownloadIcon, BookOpenIcon, ArrowRightOnRectangleIcon, QuestionMarkCircleIcon } from './Icons';

interface DocumentationProps {
  onClose: () => void;
}

const StepCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; step: number; }> = ({ icon, title, children, step }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 flex flex-col items-center">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300">
                {icon}
            </span>
             <div className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">STEP {step}</div>
        </div>
        <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h3>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{children}</p>
        </div>
    </div>
);

const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans animate-fade-in">
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
      <main className="container mx-auto p-4 md:p-8">
        <header className="relative text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-4">
            <BookOpenIcon className="h-10 w-10" />
            <span>取扱説明書</span>
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">「PDF設計書アナライザー」を最大限に活用する方法</p>
           <button 
              onClick={onClose} 
              className="absolute top-0 right-0 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 transform rotate-180" />
              アプリに戻る
            </button>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold mb-6 border-b pb-3 border-gray-200 dark:border-gray-700">このアプリでできること</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              このツールは、Excelなどからエクスポートされた、画像や複雑なレイアウトを含むPDF形式の設計書をAIが解析し、構造化された読みやすいMarkdownドキュメントに変換します。
              さらに、AIとの対話を通じてドキュメントの曖昧な点を解消し、完成度を高めていくことができます。最終的には、元の設計書（Excelファイルなど）にフィードバックするための具体的な修正点リストも生成できます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-8 border-b pb-3 border-gray-200 dark:border-gray-700">基本的な使い方 (メインフロー)</h2>
            <div className="space-y-10">
                <StepCard step={1} icon={<UploadIcon className="h-6 w-6" />} title="1. PDFファイルをアップロード">
                    まずはじめに、解析したい設計書のPDFファイルをアップロードします。画面左側の「設定」でAIプロバイダー（GeminiまたはOpenRouter）を選択し、必要に応じてAPIキーを設定してください。
                </StepCard>

                <StepCard step={2} icon={<WandSparklesIcon className="h-6 w-6" />} title="2. ドキュメントを解析">
                    「ドキュメントを解析」ボタンをクリックします。AIがPDFの内容（テキスト、表、図）を読み取り、構造化されたMarkdownドキュメントを生成します。これがドキュメントの「初期解析版」となります。
                </StepCard>

                <StepCard step={3} icon={<SparklesIcon className="h-6 w-6" />} title="3. AIとの対話でドキュメントを改良 (繰り返し)">
                    生成されたMarkdownの品質をさらに向上させるために、「さらに改良する (AIに質問させる)」ボタンをクリックします。AIがドキュメント内の曖昧な点や不足している可能性のある情報を特定し、あなたに質問します。
                    <br/><br/>
                    AIからの質問に回答したり、追加で修正したい点を具体的に指示したりすることで、AIはそれらの情報を反映した「改良版」のドキュメントを新たに生成します。このステップは、ドキュメントの完成度に満足するまで何度でも繰り返すことができます。
                </StepCard>
                
                <StepCard step={4} icon={<AdjustmentsHorizontalIcon className="h-6 w-6" />} title="4. 差分を確認し、元の設計書を更新">
                    ドキュメントの改良が完了したら、「最初の解析結果との差分を確認」ボタンをクリックします。これにより、初期解析版と最終的な改良版との間で、どのような「意味のある変更」が加えられたかが一目でわかるチェックリストが生成されます。
                    <br/><br/>
                    この差分リストを参考に、<strong>元の設計書（Excelファイルなど）に修正内容を反映させてください。</strong>これにより、設計書の原本とAIで改良した内容との一貫性を保つことができます。
                </StepCard>

                <StepCard step={5} icon={<DownloadIcon className="h-6 w-6" />} title="5. 完成したMarkdownをダウンロード">
                    完成したドキュメントは、いつでも「ダウンロード」ボタンからMarkdownファイルとして保存できます。プロジェクトのドキュメンテーションや情報共有にご活用ください。
                </StepCard>
            </div>
          </section>

           <section>
            <h2 className="text-2xl font-bold mb-6 border-b pb-3 border-gray-200 dark:border-gray-700">よくある質問</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-primary-500" />解析がうまくいかない場合は？</h3>
                <p className="mt-1 ml-7 text-gray-600 dark:text-gray-400">
                  モデルを変更したり、「AI設定」でプロンプトやTemperature（AIの創造性の度合い）を調整したりすることで、結果が改善される場合があります。「解析モード」を「画像+テキスト」にすると精度が向上することもありますが、トークン消費量が増える点にご注意ください。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-primary-500" />もっと高度なカスタマイズはできますか？</h3>
                <p className="mt-1 ml-7 text-gray-600 dark:text-gray-400">
                  はい。「AI設定」セクションでは、各ステップ（初期解析、質問生成など）で使用されるシステムプロンプトを直接編集できます。特定の設計書フォーマットに特化した指示を与えることで、より精度の高い結果を得られます。編集したプロンプトは「プリセットとして保存」機能で名前を付けて保存し、後で簡単に呼び出すことができます。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-primary-500" />AIからの質問だけでは修正しきれない場合は？</h3>
                <p className="mt-1 ml-7 text-gray-600 dark:text-gray-400">
                  AIとの対話画面にある「追加の修正指示」の入力欄を活用してください。ここには、AIからの質問とは別に、自由な形式で具体的な修正指示を書き込めます。「セクション2.1の表の項目名を変更して」「全体のトーンをよりフォーマルに」といった細かい微調整が可能です。この指示は、AIへの回答よりも優先して反映されます。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-primary-500" />「Thinkingモード」とは何ですか？</h3>
                <p className="mt-1 ml-7 text-gray-600 dark:text-gray-400">
                  OpenRouterの一部のモデルで利用できる機能です。有効にすると、AIは回答を生成する前により深く「考える」時間を使います。これにより、出力の精度や論理的な整合性が向上する傾向がありますが、応答時間が長くなり、消費トークン（コスト）も増加する可能性があります。複雑なドキュメントを扱う場合に試す価値があります。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-primary-500" />APIキーはどこで保存されますか？</h3>
                <p className="mt-1 ml-7 text-gray-600 dark:text-gray-400">
                  OpenRouterのAPIキーは、お使いのブラウザのローカルストレージにのみ保存されます。外部のサーバーに送信・保存されることはありません。
                </p>
              </div>
            </div>
           </section>

        </div>
        <footer className="text-center mt-8">
            <button 
              onClick={onClose} 
              className="inline-flex items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 transform rotate-180" />
              アプリに戻る
            </button>
        </footer>
      </main>
    </div>
  );
};

export default Documentation;
