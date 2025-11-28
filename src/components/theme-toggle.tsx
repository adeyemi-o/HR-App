import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme()

    return (
        <div className={cn("flex items-center p-1 bg-[#F9FAFB] dark:bg-card border border-[rgba(162,161,168,0.1)] rounded-[10px]", className)}>
            <button
                onClick={() => setTheme("light")}
                className={cn(
                    "flex items-center justify-center gap-2 flex-1 px-4 py-2 text-sm font-medium rounded-[8px] transition-all",
                    theme === "light"
                        ? "bg-white dark:bg-[#7152F3] text-[#16151C] dark:text-white shadow-sm border border-[rgba(162,161,168,0.1)] dark:border-none"
                        : "text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white"
                )}
            >
                <Sun className="h-4 w-4" />
                <span>Light</span>
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={cn(
                    "flex items-center justify-center gap-2 flex-1 px-4 py-2 text-sm font-medium rounded-[8px] transition-all",
                    theme === "dark"
                        ? "bg-white dark:bg-[#7152F3] text-[#16151C] dark:text-white shadow-sm border border-[rgba(162,161,168,0.1)] dark:border-none"
                        : "text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white"
                )}
            >
                <Moon className="h-4 w-4" />
                <span>Dark</span>
            </button>
        </div>
    )
}
