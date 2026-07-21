import { ExcelUpload } from "@/components/points/ExcelUpload";

export default function ExcelPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-text">استيراد إكسل</h1>
      <ExcelUpload />
    </div>
  );
}
