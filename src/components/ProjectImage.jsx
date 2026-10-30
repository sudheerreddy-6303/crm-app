import React, { useEffect, useState } from "react";
import { projectImageUrl } from "../utils/projectImage.js";

// ADDED: shows a project's saved image (nothing when the project has no image).
// Click opens it full size in a new tab.
export default function ProjectImage({ project, className = "proj-img", alt }) {
  const [url, setUrl] = useState("");
  const id = project && project.id;
  const name = project && project.image_name;
  useEffect(() => {
    let alive = true;
    setUrl("");
    if (id && name) projectImageUrl(id, name).then((u) => { if (alive) setUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [id, name]);
  if (!name) return null;
  if (!url) return <div className={`${className} proj-img-loading`}>Loading image…</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img className={className} src={url} alt={alt || `${project.project_name || "Project"} image`} />
    </a>
  );
}
