import { useQuery } from "@tanstack/react-query";
import { fetchMeetingById } from "services/meeting.service";

export const useMeeting = (id, enabled) => {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: () => fetchMeetingById(id),
    enabled,
  });
};