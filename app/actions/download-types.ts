export type DownloadState = {
  ok: boolean;
  url: string;
  message: string;
};

export const defaultDownloadState: DownloadState = {
  ok: false,
  url: "",
  message: "Download is locked until payment is completed.",
};
