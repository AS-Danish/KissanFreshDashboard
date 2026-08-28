"use client";

import { useEffect, useState } from "react";

export function ImageFilePreview({ file, className = "h-full w-full object-cover" }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSource(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!source) return null;
  return <img src={source} alt={`Preview of ${file.name}`} className={className} />;
}
