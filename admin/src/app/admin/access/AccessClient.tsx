"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

type Role = "superadmin" | "admin" | "none";

type AllowList = {
  tenantId?: string;
  superAdmins: string[];
  admins: string[];
};

function uniqSortedLower(arr: string[]) {
  const s = new Set(arr.map((x) => x.trim().toLowerCase()).filter(Boolean));
  return Array.from(s).sort();
}

export function AccessClient(props: { initialAllow: AllowList; role: Role }) {
  const { showToast } = useToast();
  const [allow, setAllow] = useState<AllowList>(props.initialAllow);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [asSuper, setAsSuper] = useState<boolean>(false);
  const canEdit = props.role === "superadmin";

  const normalized = useMemo<AllowList>(() => {
    return {
      tenantId: allow.tenantId,
      superAdmins: uniqSortedLower(allow.superAdmins),
      admins: uniqSortedLower(allow.admins),
    };
  }, [allow]);

  useEffect(() => {
    setAllow(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addUser() {
    const e = email.trim().toLowerCase();
    if (!e) {
      showToast("Please enter an email", "error");
      return;
    }
    if (asSuper) {
      setAllow((a) => ({ ...a, superAdmins: uniqSortedLower([...a.superAdmins, e]) }));
    } else {
      setAllow((a) => ({ ...a, admins: uniqSortedLower([...a.admins, e]) }));
    }
    setEmail("");
    showToast(`Added ${e}`, "success");
  }

  function removeUser(e: string) {
    setAllow((a) => ({
      ...a,
      superAdmins: a.superAdmins.filter((x) => x !== e),
      admins: a.admins.filter((x) => x !== e),
    }));
    showToast(`Removed ${e}`, "success");
  }

  function promoteToSuper(e: string) {
    setAllow((a) => ({
      ...a,
      superAdmins: uniqSortedLower([...a.superAdmins, e]),
      admins: a.admins.filter((x) => x !== e),
    }));
    showToast(`Promoted ${e} to SuperAdmin`, "success");
  }

  function demoteToAdmin(e: string) {
    setAllow((a) => ({
      ...a,
      superAdmins: a.superAdmins.filter((x) => x !== e),
      admins: uniqSortedLower([...a.admins, e]),
    }));
    showToast(`Demoted ${e} to Admin`, "success");
  }

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText);
      }
      showToast("Access list saved successfully!", "success");
    } catch (error: any) {
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Access Control</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage who can access this admin dashboard
        </p>
        <div className="mt-2">
          <span className="text-sm text-gray-600">Your role: </span>
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#C8102E] text-white">
            {props.role}
          </span>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            You can view the access list, but only SuperAdmins can make changes.
          </p>
        </div>
      )}

      {/* User lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SuperAdmins */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">SuperAdmins</h3>
            <p className="text-sm text-gray-600 mt-1">Full access to all features</p>
          </div>
          <div className="p-6">
            {allow.superAdmins.length === 0 ? (
              <p className="text-gray-500 text-sm">No SuperAdmins</p>
            ) : (
              <ul className="space-y-2">
                {allow.superAdmins.map((e) => (
                  <li
                    key={e}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">{e}</span>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => demoteToAdmin(e)}
                          disabled={allow.superAdmins.length <= 1}
                          className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Demote
                        </button>
                        <button
                          onClick={() => removeUser(e)}
                          disabled={allow.superAdmins.length <= 1}
                          className="px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-600 mt-4">
              At least one SuperAdmin must remain.
            </p>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Admins</h3>
            <p className="text-sm text-gray-600 mt-1">Can manage team data</p>
          </div>
          <div className="p-6">
            {allow.admins.length === 0 ? (
              <p className="text-gray-500 text-sm">No Admins</p>
            ) : (
              <ul className="space-y-2">
                {allow.admins.map((e) => (
                  <li
                    key={e}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">{e}</span>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => promoteToSuper(e)}
                          className="px-3 py-1 text-xs font-medium text-[#C8102E] hover:bg-red-100 rounded transition-colors"
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => removeUser(e)}
                          className="px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add user form */}
      {canEdit && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add User</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@csec360.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") addUser();
              }}
            />
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={asSuper}
                onChange={(e) => setAsSuper(e.target.checked)}
                className="rounded text-[#C8102E] focus:ring-2 focus:ring-[#C8102E]"
              />
              <span className="text-sm font-medium text-gray-700">Add as SuperAdmin</span>
            </label>
            <button
              onClick={addUser}
              className="px-6 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D25] font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
