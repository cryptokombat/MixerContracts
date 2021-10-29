//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import './interfaces/ICollection.sol';

contract CryptoKombatMixer is ERC1155Holder, Ownable {
    enum HeroEdition {
        EMPTY,
        GENESIS,
        EPIC,
        RARE,
        COMMON
    }

    struct MixRequest {
        address account;
        HeroEdition editionIn;
        uint256[] inIds;
    }

    struct MixYield {
        HeroEdition edition;
        uint256 chance;
    }

    mapping(HeroEdition => MixYield[]) public mixerConfigs;
    mapping(HeroEdition => bool) public mixerConfigExists;
    mapping(uint256 => HeroEdition) public heroIdToEdition;
    mapping(HeroEdition => uint256[]) public editionToHeroIds;

    ICollection public collection;

    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 private constant DECIMAL_PRECISION = 3;
    uint256 private constant PERCENTS_SUM = 100 * 10**DECIMAL_PRECISION;
    uint256 private randomNonce;

    uint256 private mixRequestId;

    mapping(bytes32 => MixRequest) public mixRequests;

    // EVENTS
    event MixRequested(address indexed account, bytes32 indexed requestId);
    event HeroesMixSuceess(
        address indexed account,
        bytes32 indexed requestId,
        HeroEdition editionIn,
        HeroEdition editionOut,
        uint256 tokenId
    );
    event HeroesMixReverted(address indexed account, bytes32 indexed requestId, HeroEdition editionIn);
    event MixerConfigSet(HeroEdition indexed editionIn, HeroEdition[] indexed editionsOut, uint256[] indexed chances);
    event EditionToIdMappingSet(HeroEdition indexed edition, uint256[] indexed ids);
    event EditionToIdMappingAdded(HeroEdition indexed edition, uint256 indexed id);

    // CONSTRUCTOR
    constructor(address collection_) {
        require(collection_ != address(0), 'CryptoKombatMixer: Collection zero address');
        collection = ICollection(collection_);
    }

    // PUBLIC FUNCTIONS

    function mixHeroes(uint256[] memory _ids) external virtual {
        require(_ids.length == 3, 'CryptoKombatMixer: Incorrect input length');
        require(isSameEditions(_ids), 'CryptoKombatMixer: Input editions are not same');
        require(isConfigExists(heroIdToEdition[_ids[0]]), 'CryptoKombatMixer: Mixer config does not exist');

        collection.safeBatchTransferFrom(msg.sender, address(this), _ids, _getFilledArray(_ids.length, 1), bytes('0x0'));
        //collection.burnBatch(msg.sender, _ids, _getFilledArray(3, 1));
        mixRequestId++;
        mixRequests[bytes32(mixRequestId)] = MixRequest({ account: msg.sender, editionIn: heroIdToEdition[_ids[0]], inIds: _ids });

        emit MixRequested(msg.sender, bytes32(mixRequestId));

        _getOutcome(bytes32(mixRequestId), random());
    }

    // PRIVATE FUNCTIONS

    function _getOutcome(bytes32 requestId, uint256 randomValue) internal {
        MixRequest memory mixRequest = mixRequests[requestId];

        HeroEdition editionOut = _getOutputEdition(mixRequest.editionIn, randomValue);
        uint256 tokenId = _getValidOutputTokenId(editionOut, randomValue);

        if (tokenId > 0) {
            collection.mint(mixRequest.account, tokenId, 1, bytes('0x0'));

            emit HeroesMixSuceess(mixRequest.account, requestId, mixRequest.editionIn, editionOut, tokenId);
        } else {
            collection.safeBatchTransferFrom(
                address(this),
                mixRequest.account,
                mixRequest.inIds,
                _getFilledArray(mixRequest.inIds.length, 1),
                bytes('0x0')
            );
            emit HeroesMixReverted(mixRequest.account, requestId, mixRequest.editionIn);
        }
        delete mixRequests[requestId];
    }

    function _getOutputEdition(HeroEdition editionIn, uint256 randomValue) internal view returns (HeroEdition editionOut) {
        uint256 randomChance = randomValue % PERCENTS_SUM;

        for (uint256 i = mixerConfigs[editionIn].length - 1; i > 0; i--) {
            uint256 checkChance = mixerConfigs[editionIn][i].chance;
            if (randomChance < checkChance) {
                return mixerConfigs[editionIn][i].edition;
            } else {
                randomChance = randomChance - checkChance;
            }
        }
        return mixerConfigs[editionIn][0].edition;
    }

    function _getValidOutputTokenId(HeroEdition editionOut, uint256 randomValue) internal view returns (uint256 tokenId) {
        uint256[] memory randomArray = expandRandom(randomValue, editionToHeroIds[editionOut].length);
        for (uint256 i = 1; i < randomArray.length; i++) {
            uint256 randomIndex = randomArray[i] % editionToHeroIds[editionOut].length;
            tokenId = editionToHeroIds[editionOut][randomIndex];
            if (collection.totalSupply(tokenId) + 1 < collection.maxSupply(tokenId)) {
                return tokenId;
            }
        }
        return 0;
    }

    // Helper functions

    function isSameEditions(uint256[] memory _ids) internal view returns (bool) {
        HeroEdition _prevEdition = heroIdToEdition[_ids[0]];
        for (uint256 i = 1; i < _ids.length; i++) {
            HeroEdition _currentEdition = heroIdToEdition[_ids[0]];
            if (_prevEdition != _currentEdition) {
                return false;
            }
            _prevEdition = _currentEdition;
        }
        return true;
    }

    function isConfigExists(HeroEdition _edition) internal view returns (bool) {
        return mixerConfigExists[_edition];
    }

    function random() private returns (uint256) {
        randomNonce++;
        return uint256(keccak256(abi.encodePacked(block.number, block.timestamp, block.difficulty, _msgSender(), randomNonce)));
    }

    function expandRandom(uint256 randomValue, uint256 n) internal pure returns (uint256[] memory expandedValues) {
        expandedValues = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            expandedValues[i] = uint256(keccak256(abi.encode(randomValue, i)));
        }
        return expandedValues;
    }

    function _getFilledArray(uint256 n, uint256 v) internal pure returns (uint256[] memory array) {
        array = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            array[i] = v;
        }
        return array;
    }

    function _transferHeroes(uint256[] memory _ids, address _to) internal {
        collection.safeBatchTransferFrom(address(this), _to, _ids, _getFilledArray(_ids.length, 1), bytes('0x0'));
    }

    function _transferAllHeroes(address _to) internal {
        uint256[] memory ids = editionToHeroIds[HeroEdition.COMMON];

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 balance = collection.balanceOf(address(this), ids[i]);
            if (balance > 0) {
                collection.safeTransferFrom(address(this), _to, ids[i], balance, bytes('0x0'));
            }
        }

        ids = editionToHeroIds[HeroEdition.RARE];

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 balance = collection.balanceOf(address(this), ids[i]);
            if (balance > 0) {
                collection.safeTransferFrom(address(this), _to, ids[i], balance, bytes('0x0'));
            }
        }

        ids = editionToHeroIds[HeroEdition.EPIC];

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 balance = collection.balanceOf(address(this), ids[i]);
            if (balance > 0) {
                collection.safeTransferFrom(address(this), _to, ids[i], balance, bytes('0x0'));
            }
        }
    }

    // Admin functions

    /*
        Set mixer config, chances should be in increasing order
        
        For COMMON in
        - [EPIC,RARE,COMMON] [3700,36600,59700]
        For RARE in
        - [COMMON,EPIC,RARE] [9700,34700,55600]
        
        Sum should be eq DECIMAL_PRECISION       
    */
    function setMixerConfig(
        HeroEdition _in,
        HeroEdition[] memory _out,
        uint256[] memory _chances
    ) external onlyOwner {
        require(_out.length == _chances.length, 'CryptoKombatMixer: Params length mismatch');

        uint256 sum;
        uint256 prevChance;

        for (uint256 i = 0; i < _chances.length; i++) {
            require(_chances[i] > prevChance, 'CryptoKombatMixer: Chances should be in increasing order');
            prevChance = _chances[i];
            sum += _chances[i];

            if (mixerConfigs[_in].length > i) {
                mixerConfigs[_in][i] = MixYield({ edition: _out[i], chance: _chances[i] });
            } else {
                mixerConfigs[_in].push(MixYield({ edition: _out[i], chance: _chances[i] }));
            }
        }

        require(sum <= PERCENTS_SUM, 'CryptoKombatMixer: Chances sum exceed 100%');

        if (!mixerConfigExists[_in]) {
            mixerConfigExists[_in] = true;
        }

        emit MixerConfigSet(_in, _out, _chances);
    }

    function setEditionToIdMapping(HeroEdition _edition, uint256[] memory _ids) external onlyOwner {
        require(_edition != HeroEdition.EMPTY, 'CryptoKombatMixer: Cannot set ids for EMPTY edition');

        for (uint256 i = 0; i < _ids.length; i++) {
            heroIdToEdition[_ids[i]] = _edition;
        }
        editionToHeroIds[_edition] = _ids;

        emit EditionToIdMappingSet(_edition, _ids);
    }

    function addEditionToIdMapping(HeroEdition _edition, uint256 _id) external onlyOwner {
        require(_edition != HeroEdition.EMPTY, 'CryptoKombatMixer: Cannot set ids for EMPTY edition');

        heroIdToEdition[_id] = _edition;
        editionToHeroIds[_edition].push(_id);

        emit EditionToIdMappingAdded(_edition, _id);
    }

    function recoverHeroes(uint256[] memory _ids) external onlyOwner {
        _transferHeroes(_ids, msg.sender);
    }

    function recoverAllHeroes() external onlyOwner {
        _transferAllHeroes(msg.sender);
    }

    function burnHeroesBatch(uint256[] memory _ids) external onlyOwner {
        _transferHeroes(_ids, DEAD_ADDRESS);
    }

    function burnAllHeroes() external onlyOwner {
        _transferAllHeroes(DEAD_ADDRESS);
    }
}
