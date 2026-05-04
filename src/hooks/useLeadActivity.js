// hooks/useLeadActivity.js
import { useQuery } from "@tanstack/react-query";
import { leadActivitesById } from "services/leads.service";

export const useLeadActivity = (leadId, isOpen) => {
    return useQuery({
        queryKey: ["lead-activity", leadId],
        queryFn: () => leadActivitesById(leadId),
        enabled: !!leadId && isOpen,
    });
};