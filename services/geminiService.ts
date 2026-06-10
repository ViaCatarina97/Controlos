const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
  });
};

export const processInvoicePdf = async (file: File): Promise<any> => {
  try {
    const base64Data = await fileToBase64(file);

    const response = await fetch("/api/process-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBase64: base64Data,
        mimeType: file.type || 'application/pdf',
      }),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error("[processInvoicePdf] Failed to parse as JSON:", responseText);
    }

    if (!response.ok) {
      if (responseData && responseData.error === "AUTH_REQUIRED") {
        throw new Error("AUTH_REQUIRED");
      }
      throw new Error((responseData && responseData.error) || `HTTP error! Status: ${response.status} - ${responseText.substring(0, 150)}`);
    }

    if (!responseData) {
      throw new Error("Empty response from server");
    }

    return responseData;
  } catch (error: any) {
    console.error("Client Invoice Processing Error:", error);
    throw error;
  }
};

export const processDeliveryPdf = async (file: File): Promise<any> => {
  try {
    const base64Data = await fileToBase64(file);

    const response = await fetch("/api/process-delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBase64: base64Data,
        mimeType: file.type || 'application/pdf',
      }),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error("[processDeliveryPdf] Failed to parse as JSON:", responseText);
    }

    if (!response.ok) {
      if (responseData && responseData.error === "AUTH_REQUIRED") {
        throw new Error("AUTH_REQUIRED");
      }
      throw new Error((responseData && responseData.error) || `HTTP error! Status: ${response.status} - ${responseText.substring(0, 150)}`);
    }

    if (!responseData) {
      throw new Error("Empty response from server");
    }

    return responseData;
  } catch (error: any) {
    console.error("Client Delivery Processing Error:", error);
    throw error;
  }
};

export const processCreditNotePdf = async (file: File): Promise<any> => {
  try {
    const base64Data = await fileToBase64(file);

    const response = await fetch("/api/process-credit-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileBase64: base64Data,
        mimeType: file.type || 'application/pdf',
      }),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error("[processCreditNotePdf] Failed to parse as JSON:", responseText);
    }

    if (!response.ok) {
      if (responseData && responseData.error === "AUTH_REQUIRED") {
        throw new Error("AUTH_REQUIRED");
      }
      throw new Error((responseData && responseData.error) || `HTTP error! Status: ${response.status} - ${responseText.substring(0, 150)}`);
    }

    if (!responseData) {
      throw new Error("Empty response from server");
    }

    return responseData;
  } catch (error: any) {
    console.error("Client Credit Note Processing Error:", error);
    throw error;
  }
};
