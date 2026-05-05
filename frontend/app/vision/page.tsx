import ChatInterface from "@/app/components/chat/ChatInterface";

export default function VisionPage() {
  return (
    <ChatInterface
      mode="vision"
      title="やりたいこと・目標"
      subtitle="人生でやりたいこと・叶えたい目標を、仕事に限らず自由に書き出していきましょう"
      initialGreeting="こんにちは！人生でやりたいこと、叶えたい目標を一緒に書き出していきましょう。仕事のことでも、趣味でも、暮らしのことでも、なんでもOKです。最近「やってみたいな」と思ったことってありますか？"
      suggestedPrompts={[
        "行ってみたい場所がある",
        "挑戦してみたいことがある",
        "こんな暮らしをしてみたい",
      ]}
    />
  );
}
