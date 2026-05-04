import ChatInterface from "@/app/components/chat/ChatInterface";

export default function VisionPage() {
  return (
    <ChatInterface
      mode="vision"
      title="将来設計"
      subtitle="AIと一緒にキャリアビジョンを描き、具体的なアクションプランを考えましょう"
      initialGreeting="こんにちは！あなたの将来のキャリアについて一緒に考えていきましょう。今のキャリアに対してどんな想いがありますか？理想の働き方や目標があれば教えてください。"
      suggestedPrompts={[
        "3年後の理想のキャリアを考えたい",
        "転職すべきか迷っている",
        "キャリアチェンジの方向性を相談したい",
        "長期的なキャリアプランを立てたい",
      ]}
    />
  );
}
