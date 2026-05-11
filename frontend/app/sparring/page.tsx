import ChatInterface from "@/app/components/chat/ChatInterface";

export default function SparringPage() {
  return (
    <ChatInterface
      mode="sparring"
      title="知識の壁打ちβ"
      subtitle="日々の疑問を投げて、知識として残したい応答に💡を付けるとノートになります"
      initialGreeting="今日はどんなことを深掘りしますか？気になっていること・分からないことを投げてみてください。"
      suggestedPrompts={[
        "日焼け止めを塗る意味は？",
        "睡眠が必要な理由は？",
      ]}
    />
  );
}
