import toast, { Toaster as HotToaster } from "react-hot-toast";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        className: "!bg-surface !border !border-gold/20 !text-off-white !font-sans",
        style: {
          background: "var(--color-surface)",
          color: "var(--color-off-white)",
          border: "1px solid rgba(184,149,42,0.2)",
        },
      }}
    />
  );
}

export const showTransactionSuccess = (hash: string, message: string = "Transaction Successful") => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-surface shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-gold/30`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-off-white">{message}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-xs text-muted font-mono truncate max-w-[150px]">
                {hash}
              </span>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center text-gold-light hover:underline"
              >
                View Explorer <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gold/20">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-muted hover:text-off-white"
        >
          Close
        </button>
      </div>
    </div>
  ), { duration: 5000 });
};

export const showTransactionError = (error: string) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-surface shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-error/30`}
    >
       <div className="flex-1 w-0 p-4 shrink-0">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <XCircle className="h-5 w-5 text-error" />
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-off-white">Transaction Failed</p>
            <p className="mt-1 text-xs text-muted break-words whitespace-normal">{error}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-error/20 shrink-0">
         <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-muted hover:text-off-white"
        >
          Close
        </button>
      </div>
    </div>
  ));
}
