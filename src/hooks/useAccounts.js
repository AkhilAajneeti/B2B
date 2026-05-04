import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchAccounts } from "services/account.service"

export const useAccounts = ({limit,page}) => {
    return useQuery({
        queryKey: ["accounts",page,limit],
        queryFn: ()=>fetchAccounts({limit,page}),
        placeholderData: keepPreviousData,
    })
}
