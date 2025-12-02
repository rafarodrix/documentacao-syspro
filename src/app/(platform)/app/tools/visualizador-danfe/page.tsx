import { DanfeVisualizerTool } from "@/components/platform/tools/visualizador-danfe";

export default function AppDanfeVisualizerToolPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Visualizador DANFE</h1>
      </div>
      <DanfeVisualizerTool />
    </div>
  );
}