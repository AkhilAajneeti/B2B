// hooks/useNotificationCount.js

import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "services/notification.service";

export const useNotificationCount = () => {
  return useQuery({
    queryKey: ["notification-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 10000, // 🔥 auto update every 10 sec
  });
};