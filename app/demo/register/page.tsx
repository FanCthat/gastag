import DemoRegisterForm from "./_form";

export default function DemoRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Try GasTag free</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Fill in your details and we'll set up a private demo for you — no credit card, no commitment.
          </p>
        </div>

        {/* What happens next */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">What happens after you click submit</p>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">1</span>
              <span>We create your private demo account instantly.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">2</span>
              <span>You get 3 demo QR codes — these represent the keyring tags your customers will receive.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">3</span>
              <span>You scan one of those codes — pretending to be your customer — and register a cylinder.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">4</span>
              <span>Watch the reminder emails arrive — then log in as the supplier to see the other side.</span>
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <DemoRegisterForm />
        </div>
      </div>
    </div>
  );
}
