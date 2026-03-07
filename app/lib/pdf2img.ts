export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
  loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
    // Set the worker source to use local file
    lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsLib = lib;
    isLoading = false;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File,
): Promise<PdfConversionResult> {
  // Check file size - warn for large files that might cause issues
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      imageUrl: "",
      file: null,
      error: "PDF file is too large. Please use a smaller PDF file (max 10MB).",
    };
  }

  // Adaptive scaling based on device capabilities and file size
  const getAdaptiveScale = (fileSize: number): number => {
    // Check for mobile/low-memory devices
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const isLowMemory =
      (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4; // Less than 4GB RAM

    if (isMobile || isLowMemory || fileSize > 2 * 1024 * 1024) {
      // > 2MB
      return 2; // Lower quality for constrained devices/large files
    }
    return 3; // Medium quality for normal devices
  };

  const scale = getAdaptiveScale(file.size);

  try {
    const lib = await loadPdfJs();

    // Add timeout for PDF loading
    const arrayBuffer = await Promise.race([
      file.arrayBuffer(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("File loading timeout")), 30000),
      ),
    ]);

    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Check canvas support
    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error:
          "Canvas not supported on this device. Please try a different browser.",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Optimize canvas settings for better compatibility
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = scale >= 3 ? "high" : "medium";

    // Add timeout for rendering
    await Promise.race([
      page.render({ canvasContext: context, viewport }).promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Rendering timeout")), 30000),
      ),
    ]);

    return new Promise((resolve) => {
      // Add timeout for blob creation
      const timeoutId = setTimeout(() => {
        resolve({
          imageUrl: "",
          file: null,
          error: "Image conversion timeout. Please try again.",
        });
      }, 15000);

      canvas.toBlob(
        (blob) => {
          clearTimeout(timeoutId);
          if (blob) {
            // Create a File from the blob with the same name as the pdf
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, {
              type: "image/png",
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            resolve({
              imageUrl: "",
              file: null,
              error:
                "Failed to create image blob. The PDF may be corrupted or contain unsupported content.",
            });
          }
        },
        "image/png",
        0.9, // Slightly reduced quality for better compatibility
      );
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Provide more specific error messages based on error type
    let userFriendlyError = "Failed to convert PDF to image";

    if (errorMessage.includes("timeout")) {
      userFriendlyError =
        "PDF conversion timed out. The file may be too complex or your device may be running low on memory.";
    } else if (errorMessage.includes("InvalidPDFException")) {
      userFriendlyError =
        "The PDF file appears to be corrupted or invalid. Please try a different PDF file.";
    } else if (errorMessage.includes("MissingPDFException")) {
      userFriendlyError =
        "Unable to read the PDF file. Please ensure it's a valid PDF document.";
    } else if (errorMessage.includes("UnexpectedResponseException")) {
      userFriendlyError =
        "Network error while loading PDF tools. Please check your internet connection and try again.";
    }

    return {
      imageUrl: "",
      file: null,
      error: `${userFriendlyError} (Technical details: ${errorMessage})`,
    };
  }
}
