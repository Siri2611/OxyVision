"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
 
interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}
 
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}
 
const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);
 
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
 
export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
 
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
 
  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};
 
export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};
 
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};
 
export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      {/* Sidebar */}
      <motion.div
        className={cn(
          "fixed left-0 top-0 h-screen px-4 py-6 hidden md:flex md:flex-col bg-neutral-900 border-r border-neutral-700 w-[80px] shrink-0 shadow-xl z-40",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "80px") : "80px",
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};
 
export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-900 border-b border-neutral-700 w-full shadow-lg z-50"
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🫁</span>
          </div>
          <h1 className="text-lg font-bold text-white">BreatheSense</h1>
        </div>
        <IconMenu2
          className="text-white hover:text-red-400 transition-colors cursor-pointer"
          onClick={() => setOpen(!open)}
        />
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-80 inset-y-0 left-0 bg-neutral-900 p-6 z-[100] flex flex-col shadow-2xl overflow-hidden",
                className
              )}
            >
              <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🫁</span>
                  </div>
                  <h1 className="text-xl font-bold text-white">BreatheSense</h1>
                </div>
                <IconX 
                  className="text-white hover:text-red-400 transition-colors cursor-pointer w-6 h-6"
                  onClick={() => setOpen(false)}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
 
export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  const pathname = usePathname();
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-3 px-3 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-all duration-200 cursor-pointer",
        isActive && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    >
      <div className={cn(
        "text-neutral-400 group-hover/sidebar:text-red-400 transition-colors flex-shrink-0",
        isActive && "text-white"
      )}>
        {link.icon}
      </div>

      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
          marginLeft: animate ? (open ? "12px" : 0) : "12px",
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-200 whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute right-2 w-2 h-2 bg-white rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </Link>
  );
};

// Loading component for consistent loading states
export const LoadingSpinner = ({ 
  size = "md", 
  text = "Loading...", 
  className = "" 
}: { 
  size?: "sm" | "md" | "lg"; 
  text?: string;
  className?: string;
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="text-center">
        <div className={cn("animate-spin rounded-full border-b-2 border-red-600 mx-auto mb-4", sizeClasses[size])}></div>
        {text && <p className="text-neutral-600">{text}</p>}
      </div>
    </div>
  );
};
