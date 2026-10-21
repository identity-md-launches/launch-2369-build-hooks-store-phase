// Local fork test only. Never deployed to a public chain.
pragma solidity ^0.8.26;
contract ControlHook {
    address public owner;
    bool public paused;
    mapping(address => bool) public isAllowed;
    uint256 public jar = 1 ether;
    constructor() { owner = msg.sender; }
    modifier onlyOwner() { require(msg.sender == owner, "owner only"); _; }
    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }
    function setAllowed(address[] calldata accounts, bool allowed) external onlyOwner { for(uint256 i; i<accounts.length; ++i) isAllowed[accounts[i]]=allowed; }
    function buyback() external { jar = 0; }
}
