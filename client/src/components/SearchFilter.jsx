import { FaSearch } from "react-icons/fa";

function SearchFilter({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  membershipFilter,
  setMembershipFilter,
  modeFilter,
  setModeFilter,
  levelFilter,
  setLevelFilter,
}) {
  return (
    <div className="search-row">
      <div className="search-box">
        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="search-input"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="No Payment">No Payment</option>
        </select>

        <select
          value={membershipFilter}
          onChange={(e) => setMembershipFilter(e.target.value)}
          className="search-input"
        >
          <option value="All">All Membership</option>
          <option value="Yes">Members</option>
          <option value="No">Non Members</option>
        </select>

        <select
           value={modeFilter}
           onChange={(e) => setModeFilter(e.target.value)}
           className="search-input"
          >
            <option value="All">All Modes</option>
            <option value="online">Online</option>
            <option value="physical">Physical</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="search-input"
          >
            <option value="All">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
         </select>
         </div>
  );
}

export default SearchFilter;