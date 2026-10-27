import Link from "next/link";
import { sizeGuide } from "@/data/size-guide";
import "@/app/size-guide/size-guide.css";

export default function SizeGuideContent() {
  return <div className="size-guide-content">
    <p className="size-guide-review">Sizing reference for review. These body measurements still need final approval; contact us if you need help choosing a size.</p>
    <div className="size-guide-scroll"><table><caption>Body reference measurements · cm / in</caption><thead><tr><th scope="col">Measurement</th>{sizeGuide.sizes.map(size => <th scope="col" key={size}>{size}</th>)}</tr></thead><tbody>{sizeGuide.measurements.map(row => <tr key={row.name}><th scope="row">{row.name}</th>{row.values.map((value, index) => <td key={sizeGuide.sizes[index]}><strong>{value.cm} cm</strong><small>{value.inches.toFixed(1)} in</small></td>)}</tr>)}</tbody></table></div>
    <p>These are body reference measurements, not garment measurements or size ranges. Fit can vary by style. XS and XL references are not yet supplied.</p>
    <h3>How to measure</h3><p>Use a soft measuring tape. Keep it level and close to your body without pulling tight.</p>
    <ul><li><strong>Bust:</strong> Measure around the fullest part of your bust, with your arms relaxed.</li><li><strong>Waist:</strong> Measure around your natural waist, usually the narrowest part of your torso.</li><li><strong>Hips:</strong> With feet together, measure around the fullest part of your hips and bottom.</li></ul>
    <p>Need help choosing? <Link href="/contact">Contact us</Link> with your measurements and the product you’re considering.</p>
  </div>;
}
