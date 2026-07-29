"use client";

type Props = {
  onFileSelect: (file: File) => void;
};


export default function AudioUploader({
  onFileSelect,
}: Props) {

  return (
    <input
      type="file"
      accept="audio/*"
      className="text-white"
      onChange={(e) => {

        const file = e.target.files?.[0];

        if (file) {
          onFileSelect(file);
        }

      }}
    />
  );
}