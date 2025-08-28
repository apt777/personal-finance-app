"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table"; // Assuming table components exist in @repo/ui

async function getRecentTransactions() {
  const res = await fetch("/api/transactions");
  if (!res.ok) {
    throw new Error("Failed to fetch recent transactions");
  }
  return res.json();
}

export function RecentTransactions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recentTransactions"],
    queryFn: getRecentTransactions,
  });

  if (isLoading) return <div>Loading transactions...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Account</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((transaction: any) => ( // Type this properly with Zod schema
          <TableRow key={transaction.id}>
            <TableCell>{transaction.txDate.split('T')[0]}</TableCell> {/* Use string directly */}
            <TableCell>{transaction.memo || transaction.type}</TableCell>
            <TableCell>{`${transaction.amountOriginal} ${transaction.currencyOriginal}`}</TableCell>
            <TableCell>{transaction.account.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}