type Block = { type: string; text: string };
export default function PolicyCopy({ blocks }: { blocks: Block[] }) {
  return <div className="policy-copy">{blocks.map((block, index) => {
    if (block.type === "h1") return null;
    if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
    if (block.type === "li") return <p className="policy-list" key={index}>• {block.text}</p>;
    return <p key={index}>{block.text}</p>;
  })}</div>;
}
