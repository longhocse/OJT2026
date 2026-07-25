import React from "react";

const PageLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[40vh] items-center justify-center px-4 text-on-surface-variant"
  >
    <span className="sr-only">Đang tải nội dung</span>
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
  </div>
);

export default PageLoader;
