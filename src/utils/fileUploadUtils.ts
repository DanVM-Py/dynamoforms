
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a file to the Supabase storage and returns the URL
 * @param file The file to upload
 * @param folderPath Optional folder path within the bucket
 * @returns The public URL of the uploaded file
 */
export const uploadFileToStorage = async (
  file: File,
  folderPath: string = ""
): Promise<string> => {
  try {
    // Create a unique file name to prevent collisions
    const fileExtension = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Upload the file to the Supabase storage
    const { data, error } = await supabase.storage
      .from("form_attachments")
      .upload(fullPath, file, {
        cacheControl: "3600",
        upsert: false,
      });
    
    if (error) {
      throw error;
    }
    
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from("form_attachments")
      .getPublicUrl(data.path);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("No se pudo subir el archivo. Por favor, inténtelo de nuevo.");
  }
};

/**
 * Extracts the file data from a data URL 
 * @param dataUrl The data URL string
 * @returns File object created from the data URL
 */
export const dataURLtoFile = (
  dataUrl: string, 
  filename: string
): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

/**
 * Uploads a base64 image to storage
 * @param dataUrl The base64 data URL of the image
 * @param folderPath Optional folder path within the bucket
 * @returns The public URL of the uploaded file
 */
export const uploadBase64Image = async (
  dataUrl: string,
  folderPath: string = ""
): Promise<string> => {
  try {
    const file = dataURLtoFile(dataUrl, `signature-${Date.now()}.png`);
    return await uploadFileToStorage(file, folderPath);
  } catch (error) {
    console.error("Error uploading base64 image:", error);
    throw new Error("No se pudo subir la imagen. Por favor, inténtelo de nuevo.");
  }
};
