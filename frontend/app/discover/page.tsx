import ChatInterface from "@/app/components/chat/ChatInterface";

export default function DiscoverPage() {
  return (
    <ChatInterface
      mode="discover"
      title="価値観発見"
      subtitle="雑談しながら、あなたの好みや考え方を一緒に見つけていきます"
      initialGreeting="こんにちは！今日はいろんな話を聞かせてください。"
      suggestedPrompts={[
        "今までで楽しかったこと、感動したこと",
        "仕事選びで何を重視すべきか迷ってる",
        "雑談しながら自分を知りたい",
      ]}
    />
  );
}
