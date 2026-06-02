import NewVendorForm from "./_form";

export default function NewVendorPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add vendor</h1>
      <div className="max-w-xl bg-white rounded-xl border border-gray-200 p-6">
        <NewVendorForm />
      </div>
    </div>
  );
}
