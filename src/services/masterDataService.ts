import { Config } from "@/constant/config";
import { getAuthData } from "./authService";

const getHeaders = () => {
  const auth = getAuthData();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth?.token}`,
  };
};

// ==================== GROUP INDICATOR ====================

export const fetchGroupIndicators = async () => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch group indicators");
  }

  return response.json();
};

export const fetchGroupIndicatorById = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch group indicator");
  }

  return response.json();
};

export const createGroupIndicator = async (data: {
  name: string;
  is_active: boolean;
}) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to create group indicator");
  }

  return response.json();
};

export const updateGroupIndicator = async (
  id: number,
  data: { name: string; is_active: boolean },
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update group indicator");
  }

  return response.json();
};

export const deleteGroupIndicator = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/group-indicators/${id}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete group indicator");
  }

  return response.json();
};

// ==================== INDICATOR ====================

export const fetchIndicators = async () => {
  const response = await fetch(`${Config.UrlBackend}/api/fin/indicators`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch indicators");
  }

  return response.json();
};

export const fetchIndicatorById = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch indicator");
  }

  return response.json();
};

export const createIndicator = async (data: {
  name: string;
  group_id: number;
  is_active: boolean;
}) => {
  const response = await fetch(`${Config.UrlBackend}/api/fin/indicators`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create indicator");
  }

  return response.json();
};

export const updateIndicator = async (
  id: number,
  data: { name: string; group_id: number; is_active: boolean },
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update indicator");
  }

  return response.json();
};

export const deleteIndicator = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicators/${id}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete indicator");
  }

  return response.json();
};

// ==================== INDICATOR ACHIEVEMENT ====================

export const fetchIndicatorAchievements = async (params?: {
  indicatorId?: number;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.indicatorId)
    query.append("indicatorId", String(params.indicatorId));
  if (params?.year) query.append("year", String(params.year));
  if (params?.month) query.append("month", String(params.month));
  if (params?.page) query.append("page", String(params.page));
  if (params?.pageSize) query.append("pageSize", String(params.pageSize));

  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicator-achievements?${query.toString()}`,
    { method: "GET", headers: getHeaders() },
  );
  if (!response.ok) throw new Error("Failed to fetch indicator achievements");
  return response.json();
};

export const fetchIndicatorAchievementsByPeriod = async (
  year: number,
  month: number,
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicator-achievements/period/${year}/${month}`,
    { method: "GET", headers: getHeaders() },
  );
  if (!response.ok) throw new Error("Failed to fetch achievements for period");
  return response.json();
};

export const batchUpsertAchievements = async (data: {
  year: number;
  month: number;
  items: { indicatorId: number; value: number; note?: string | null }[];
  updatedBy?: string;
}) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicator-achievements/batch`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) throw new Error("Failed to batch upsert achievements");
  return response.json();
};

export const updateIndicatorAchievement = async (
  id: number,
  data: {
    year: number;
    month: number;
    value: number;
    note?: string | null;
    updatedBy?: string;
  },
) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicator-achievements/${id}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) throw new Error("Failed to update indicator achievement");
  return response.json();
};

export const deleteIndicatorAchievement = async (id: number) => {
  const response = await fetch(
    `${Config.UrlBackend}/api/fin/indicator-achievements/${id}`,
    { method: "DELETE", headers: getHeaders() },
  );
  if (!response.ok) throw new Error("Failed to delete indicator achievement");
  return response.json();
};
