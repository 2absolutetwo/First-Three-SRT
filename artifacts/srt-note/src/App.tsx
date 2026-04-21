import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Notepad from "@/pages/Notepad";
const queryClient = new QueryClient();
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Notepad />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
