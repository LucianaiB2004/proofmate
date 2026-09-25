import { useId, useState } from 'react';
import { validateFiles } from './importFiles';

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
}

export function FileDropzone({ onFilesAccepted }: FileDropzoneProps) {
  const id = useId();
  const [message, setMessage] = useState('支持 PDF、文档、数据与图片，单个文件不超过 10MB');
  const [acceptedNames, setAcceptedNames] = useState<string[]>([]);

  const handleFiles = (files: FileList | null) => {
    const result = validateFiles(files ?? []);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setAcceptedNames(result.files.map((file) => file.name));
    setMessage(result.ignored.length ? `已忽略：${result.ignored.join('、')}` : `已选择 ${result.files.length} 个文件`);
    onFilesAccepted(result.files);
  };

  return (
    <div className="dropzone">
      <span className="dropzone-mark" aria-hidden="true">＋</span>
      <label htmlFor={id}>拖入你的项目材料</label>
      <input id={id} type="file" multiple accept=".pdf,.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp" onChange={(event) => handleFiles(event.target.files)} />
      <p aria-live="polite">{message}</p>
      {acceptedNames.length > 0 && <ul className="accepted-materials" data-testid="accepted-materials">{acceptedNames.map((name) => <li key={name}>{name}</li>)}</ul>}
    </div>
  );
}
