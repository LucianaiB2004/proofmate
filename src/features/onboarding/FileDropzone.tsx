import { useId, useState, type RefObject } from 'react';
import { validateFiles } from './importFiles';

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function FileDropzone({ onFilesAccepted, inputRef }: FileDropzoneProps) {
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
      <input ref={inputRef} id={id} aria-label="选择项目材料" type="file" multiple accept=".pdf,.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff" onChange={(event) => handleFiles(event.target.files)} />
      <p aria-live="polite">{message}</p>
      <small className="dropzone-processing-note">文本 PDF 在浏览器读取；图片和扫描 PDF 自动使用 TextIn OCR。</small>
      {acceptedNames.length > 0 && <ul className="accepted-materials" data-testid="accepted-materials">{acceptedNames.map((name) => <li key={name}>{name}</li>)}</ul>}
    </div>
  );
}
