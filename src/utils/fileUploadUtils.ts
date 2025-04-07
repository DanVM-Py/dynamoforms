import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { logger } from '@/lib/logger';
import { Tables } from "@/config/environment";

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
      .from(Tables.form_attachments)
      .upload(fullPath, file, {
        cacheControl: "3600",
        upsert: false,
      });
    
    if (error) {
      logger.error("Error uploading file:", error);
      throw error;
    }
    
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(Tables.form_attachments)
      .getPublicUrl(data.path);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    logger.error("Error uploading file:", error);
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
    logger.error("Error uploading base64 image:", error);
    throw new Error("No se pudo subir la imagen. Por favor, inténtelo de nuevo.");
  }
};

/**
 * Processes form values to handle file uploads
 * @param formValues The form values to process
 * @param components The form components definition
 * @returns The processed form values with file URLs
 */
export const processUploadFields = async (formValues: any, components: any[]): Promise<any> => {
  if (!components || !Array.isArray(components)) {
    return formValues;
  }

  const processedValues = { ...formValues };
  
  // Identify and process file upload fields
  for (const component of components) {
    if (component.type === 'file' && formValues[component.id]) {
      if (Array.isArray(formValues[component.id])) {
        // Handle multiple files
        const fileUrls = [];
        for (const file of formValues[component.id]) {
          if (file instanceof File) {
            const url = await uploadFileToStorage(file, 'form_uploads');
            fileUrls.push(url);
          } else if (typeof file === 'string') {
            // Already a URL or data URL
            fileUrls.push(file);
          }
        }
        processedValues[component.id] = fileUrls;
      } else if (formValues[component.id] instanceof File) {
        // Handle single file
        const url = await uploadFileToStorage(formValues[component.id], 'form_uploads');
        processedValues[component.id] = url;
      }
    } else if (component.type === 'signature' && formValues[component.id]) {
      // Handle signature field (base64 image)
      if (typeof formValues[component.id] === 'string' && formValues[component.id].startsWith('data:')) {
        const url = await uploadBase64Image(formValues[component.id], 'signatures');
        processedValues[component.id] = url;
      }
    }
  }
  
  return processedValues;
};
