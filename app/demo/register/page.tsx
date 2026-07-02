import DemoRegisterForm from "./_form";

export default function DemoRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Try GasTag free — register your demo account</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Experience the full customer journey in minutes. No credit card required.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <DemoRegisterForm />
        </div>
      </div>
    </div>
  );
}
