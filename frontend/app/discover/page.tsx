import ChatInterface from "@/app/components/chat/ChatInterface";

export default function DiscoverPage() {
  return (
    <ChatInterface
      mode="discover"
      title="価値観発見"
      subtitle="AIとの対話を通じて、あなたの仕事に対する価値観を深掘りしましょう"
      initialGreeting="こんにちは！あなたの「仕事で本当に大切にしていること」を一緒に探っていきましょう。たとえば、最近の仕事で嬉しかった瞬間や、やりがいを感じた場面を教えてください。"
      suggestedPrompts={[
        "仕事で大切にしていることを整理したい",
        "自分の強みが何なのか考えたい",
        "今の仕事にモヤモヤしている理由を知りたい",
        "どんな環境で力を発揮できるか知りたい",
      ]}
    />
  );
}
