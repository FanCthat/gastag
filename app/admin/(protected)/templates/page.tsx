import { prisma } from "@/lib/db";
import TemplateEditor from "./_editor";

export default async function TemplatesPage() {
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { type: "asc" } });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Notification Templates</h1>
      <p className="text-sm text-gray-500 mb-6">
        Use <code className="bg-gray-100 px-1 rounded">{"{{variable}}"}</code> placeholders.
        Available: clientName, clientEmail, applianceType, predictedEmptyDate, nextPredictedEmptyDate, deliveryDate, reorderUrl, daysOverdue.
      </p>
      <div className="space-y-6">
        {templates.map((t: typeof templates[number]) => (
          <TemplateEditor key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
