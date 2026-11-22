import API from "./apiClient";

export const getNotifications = async () => (await API.get("/notifications")).data;
export const markNotificationRead = async (id) =>
  (await API.patch(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async () =>
  (await API.patch("/notifications/read-all")).data;
