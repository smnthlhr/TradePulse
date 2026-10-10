import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Archive,
  Edit2,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { TradingAccount, AccountTransaction, Trade, AccountType } from '../../types/trade';
import { calculatePortfolioStats } from '../../utils/calculations';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';
import { formatDate } from '../../utils/date';

interface AccountsViewProps {
  accounts: TradingAccount[];
  transactions: AccountTransaction[];
  trades: Trade[];
  reportingCurrency: string;
  onSaveAccount: (account: TradingAccount) => void;
  onDeleteAccount: (accountId: string, deleteTrades?: boolean) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  trades,
  reportingCurrency,
  onSaveAccount,
  onDeleteAccount,
  onSaveTransaction,
}) => {
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [transactionModalAccountId, setTransactionModalAccountId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<TradingAccount | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Form states for account
  const [accName, setAccName] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Live');
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [color, setColor] = useState('#0284c7');
  const [notes, setNotes] = useState('');
  const [isArchived, setIsArchived] = useState(false);

  // Form state for transaction
  const [txType, setTxType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
  const [txAmount, setTxAmount] = useState<number>(10000);
  const [txNotes, setTxNotes] = useState('');

  const openNewAccountModal = () => {
    setEditingAccount(null);
    setAccName('');
    setBrokerName('Zerodha');
    setNickname('');
    setAccountType('Live');
    setStartingBalance(100000);
    setBaseCurrency('INR');
    setColor('#0284c7');
    setNotes('');
    setIsArchived(false);
    setIsAddAccountOpen(true);
  };

  const openEditAccountModal = (acc: TradingAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setBrokerName(acc.brokerName);
    setNickname(acc.nickname || '');
    setAccountType(acc.accountType);
    setStartingBalance(acc.startingBalance);
    setBaseCurrency(acc.baseCurrency);
    setColor(acc.color || '#0284c7');
    setNotes(acc.notes || '');
    setIsArchived(acc.isArchived);
    setIsAddAccountOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    const accountToSave: TradingAccount = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      userId: editingAccount ? editingAccount.userId : 'user_primary',
      name: accName.trim(),
      brokerName: brokerName.trim(),
      nickname: nickname.trim() || undefined,
      accountType,
      startingBalance,
      currentBalance: editingAccount ? editingAccount.currentBalance : startingBalance,
      baseCurrency,
      openingDate: editingAccount ? editingAccount.openingDate : new Date().toISOString(),
      color,
      notes,
      isArchived,
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAccount(accountToSave);
    setIsAddAccountOpen(false);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionModalAccountId || txAmount <= 0) return;

    const targetAcc = accounts.find((a) => a.id === transactionModalAccountId);
    const tx: AccountTransaction = {
      id: `tx_${Date.now()}`,
      accountId: transactionModalAccountId,
      userId: 'user_primary',
      type: txType,
      amount: txAmount,
      currency: targetAcc ? targetAcc.baseCurrency : reportingCurrency,
      date: new Date().toISOString(),
      notes: txNotes,
      createdAt: new Date().toISOString(),
    };

    onSaveTransaction(tx);
    setTransactionModalAccountId(null);
    setTxAmount(10000);
    setTxNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Trading Accounts Portfolio
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage live brokers, evaluation prop accounts, and paper journals independently with independent base currencies.
          </p>
        </div>
        <button
          onClick={openNewAccountModal}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.length === 0 && (
          <div className="col-span-full py-16 px-4 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <WalletCards className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Trading Accounts Found</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-5">
              Everything is initialized at zero. Create your first broker or paper trading account (e.g., Zerodha, Interactive Brokers, FTMO, or Paper Trading) to start recording executions and tracking your portfolio.
            </p>
            <button
              onClick={openNewAccountModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Account</span>
            </button>
          </div>
        )}

        {accounts.map((acc) => {
          const accTrades = trades.filter((t) => t.accountId === acc.id);
          const accStats = calculatePortfolioStats(accTrades);
          const netGrowth = acc.currentBalance - acc.startingBalance;
          const returnPct = acc.startingBalance > 0 ? (netGrowth / acc.startingBalance) * 100 : 0;
          const accTx = transactions.filter((tx) => tx.accountId === acc.id);

          return (
            <div
              key={acc.id}
              className={`bg-white dark:bg-zinc-900 border rounded-lg p-5 shadow-xs space-y-4 transition-all ${
                acc.isArchived ? 'opacity-60 border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                    style={{ backgroundColor: acc.color || '#0284c7' }}
                  >
                    {acc.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{acc.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                        {acc.accountType}
                      </span>
                      {acc.isArchived && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium shrink-0">
                          Archived
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 block truncate">
                      {acc.brokerName} · Base Currency: {acc.baseCurrency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => setTransactionModalAccountId(acc.id)}
                    title="Deposit / Withdrawal"
                    className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditAccountModal(acc)}
                    title="Edit Account"
                    className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingAccount(acc);
                      setDeleteConfirmInput('');
                    }}
                    title="Delete Account"
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance Cluster */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-100 dark:border-zinc-800/80 text-xs">
                <div className="min-w-0">
                  <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Current Balance</span>
                  <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate">
                    {formatCurrency(acc.currentBalance, acc.baseCurrency)}
                  </div>
                  <span className="text-[11px] text-zinc-500 block truncate">
                    Started at {formatCurrency(acc.startingBalance, acc.baseCurrency)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Net Account Growth</span>
                  <div
                    className={`text-lg font-bold font-mono truncate ${
                      netGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(netGrowth, acc.baseCurrency, { showSign: true })}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 block truncate">
                    {returnPct >= 0 ? '+' : ''}
                    {returnPct.toFixed(2)}% overall
                  </span>
                </div>
              </div>

              {/* Trading Statistics Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-mono">Trades Recorded</span>
                  <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {accStats.totalTrades}
                  </span>
                </div>

                <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-mono">Win Rate</span>
                  <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {accStats.winRate}%
                  </span>
                </div>

                <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block font-mono">Profit Factor</span>
                  <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {accStats.profitFactor}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <span className="text-zinc-400 text-[11px]">
                  {accTx.length} deposits / withdrawals recorded
                </span>
                <button
                  onClick={() => setTransactionModalAccountId(acc.id)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Log Deposit / Withdrawal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT ACCOUNT MODAL */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingAccount ? 'Edit Trading Account' : 'Create Trading Account'}
              </h3>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="e.g. Zerodha Equity Main"
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Broker Name *</label>
                  <input
                    type="text"
                    required
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    placeholder="Zerodha, Interactive Brokers, FTMO"
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="Live">Live Real Money</option>
                    <option value="Demo">Demo</option>
                    <option value="Paper">Paper Trading</option>
                    <option value="Prop firm">Prop Firm Challenge</option>
                    <option value="Funded">Funded Prop Account</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Base Currency *</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Starting Balance *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Account Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-4">
                  <input
                    type="checkbox"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                    className="rounded text-emerald-600 border-zinc-300"
                  />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Archive Account</span>
                </label>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Account Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes about leverage, rules, profit split..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAWAL TRANSACTION MODAL */}
      {transactionModalAccountId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Log Account Transaction
              </h3>
              <button
                onClick={() => setTransactionModalAccountId(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('deposit')}
                    className={`py-1.5 rounded border font-semibold ${
                      txType === 'deposit'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('withdrawal')}
                    className={`py-1.5 rounded border font-semibold ${
                      txType === 'withdrawal'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Withdrawal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('adjustment')}
                    className={`py-1.5 rounded border font-semibold ${
                      txType === 'adjustment'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Adjustment
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Amount *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Monthly capital addition, dividend payout"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <p className="text-[11px] text-zinc-500">
                Note: Deposits and withdrawals directly adjust the account balance but are excluded from trading P&amp;L calculations.
              </p>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionModalAccountId(null)}
                  className="px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE ACCOUNT CONFIRMATION MODAL (Sections 23-26) */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Delete Trading Account?
              </h3>
              <button onClick={() => setDeletingAccount(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const accTrades = trades.filter((t) => t.accountId === deletingAccount.id);
              const hasTrades = accTrades.length > 0;

              return (
                <div className="space-y-4 text-xs">
                  <p className="text-zinc-600 dark:text-zinc-300">
                    You are about to delete <strong className="text-zinc-900 dark:text-zinc-100">{deletingAccount.name}</strong> ({deletingAccount.brokerName}).
                  </p>

                  {!hasTrades ? (
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                      <p className="text-zinc-500">
                        This account currently has <strong>0 trades</strong> recorded. Deleting it will immediately remove it from your portfolio.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
                        <p className="font-semibold mb-1">
                          ⚠️ This account contains {accTrades.length} recorded trade{accTrades.length === 1 ? '' : 's'}.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          We recommend archiving the account so your historical statistics and journal remain intact.
                        </p>
                      </div>

                      {/* Option A: Archive Account */}
                      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                          Option A — Archive Account (Recommended)
                        </span>
                        <p className="text-zinc-500 text-[11px]">
                          Preserves historical analytics and ledger history, but hides the account from new trade entries.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onSaveAccount({ ...deletingAccount, isArchived: true });
                            setDeletingAccount(null);
                          }}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive "{deletingAccount.name}"</span>
                        </button>
                      </div>

                      {/* Option B: Permanent Deletion */}
                      <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                        <span className="font-bold text-rose-600 dark:text-rose-400 block">
                          Option B — Permanently Delete Account and Its Trades
                        </span>
                        <p className="text-zinc-500 text-[11px]">
                          This will permanently delete the account and all {accTrades.length} trades. This action cannot be undone.
                        </p>
                        <div>
                          <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                            Type <strong className="font-mono text-rose-600">DELETE</strong> to confirm:
                          </label>
                          <input
                            type="text"
                            placeholder="DELETE"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeletingAccount(null)}
                      className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    {!hasTrades ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAccount(deletingAccount.id, false);
                          setDeletingAccount(null);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Delete Account
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={deleteConfirmInput !== 'DELETE'}
                        onClick={() => {
                          onDeleteAccount(deletingAccount.id, true);
                          setDeletingAccount(null);
                        }}
                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${
                          deleteConfirmInput === 'DELETE'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        Permanently Delete All
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
